require('dotenv').config();
/*console.log('Checking environment...');
console.log('MONGO_URI: exists?', !!process.env.MONGO_URI);
console.log('MONGO_URI value:', process.env.MONGO_URI || 'not set');*/

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bookingDB";
const PORT = process.env.PORT || 3000;
//Middleware
app.use(cors());
app.use(express.json()); //parses json bodies
app.use(express.static('.'));//serves frontend form public folde

//MongoDb Connection 
mongoose.connect(MONGO_URI)
    .then(() => console.log(`Connected to MongoDB`))
    .catch(err => {
         console.error(`MongoDB connection error: ${err}`);
    });

    //Define Schemas
    const bookingSchema = new mongoose.Schema({
        guestName: { type: String, required: true},
         guestEmail: { type: String, required: true},
          guestPhone: { type: String, required: true},
           bookingDate: { type: Date, required: true},
            startTime: { type: Date, required: true},
             endTime: { type: Date, required: true},
              status: { type: String, default: 'confirmed'},
               createdAt: { type: Date, default: Date.now},
    })

    const userSchema = new mongoose.Schema({
       name:{type: String, required: true},
       email:{type: String, required: true, unique:true},
       phone:{type: String},
       rememberMe:{type: Boolean, default:false},
       createdAt:{ type:Date, default:Date.now} 
    });

    //Create Models
    const Booking = mongoose.model('Booking', bookingSchema);
    const User = mongoose.model('User', userSchema);

    //Api Routes
    //create a new booking 
    app.post('/api/bookings', async(req, res) => {
        try{
            const booking = new Booking(req.body);
            await booking.save();
            res.status(201).json({
                success: true,
                message: 'Booking confirmed!',
                bookingId: booking._id
            });
        }catch(error){
            res.status(400).json({
                success:false,
                message:error.message
            });
        }
    });
//get availability 
app.get('/api/availability/:date/:start/:end', async(req, res) => {
    try{
        const date = new Date(req.params.date);
        const startTime =new Date(req.params.start);
        const endTime = new Date(req.params.end);
        const conflictingBooking = await Booking.findOne({
            bookingDate: date,
            $or:[
                {startTime:{ $lt:endTime}, endTime:{$gt:startTime}}
            ]
        });
        res.json({available: !conflictingBooking});
    }catch(error){
        res.status(500).json({success:false, message: error.message});
    }
});    
//get all bookings
app.get('/api/bookings/:date', async (req, res) => {
    try{
        const date = new Date(req.params.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() +1);

        const bookings = await Booking.find({
            bookingDate:{
                $gte:date,
                $lt:nextDay
            }
        });
        res.json({success:true, bookings})
    }catch(error){
        res.status(500).json({
            success:false,
            message:error.message
        });
    }
});    
//user registration
app.post('/api/user/register',async(req, res) =>{
    try{
        const user = new User(req.body);
        await user.save();
        res.status(201).json({
            success: true, 
            message:'Registration successful!',
            userId:user._id
        });
    }catch (error){
        res.status(400).json({
            success:false,
            message:error.message
        });
    }
});
//user login
app.post('/api/user/login', async (req, res)=>{
    try{
        const {email} = req.body;
        const user = await User.findOne({email});

        if(user){
            res.json({
                success:true, 
                message:'Login successful',
                user
            });
        }else{
            res.status(404).json({
                success:false,
                message:'User not found'
            });
        }
    }catch (error){
        res.status(500).json({
            success:false,
            message:error.message
        });
    }
});

//connection to admin.js
app.get('/api/admin/bookings', async(req, res) => {
    try {
        const {startDate, endDate} = req.query;
        const bookings = await Booking.find({
            bookingDate:{
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        });
        res.json({success:true, bookings});
}catch (error){
    res.status(500).json({
        success:false,
        message:error.message
    });
}
});

app.put('/api/admin/bookings/:id', async(req, res) => {
    try{
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {status: req.body.status},
            {new:true}
        );
        res.json({success: true, booking});
    }catch(error){
        res.status(500).json({ success:false, message: error.message});
        }    
    });
  
app.listen(PORT, () =>{
    console.log(`Server running on port ${PORT}`);
});
//gathering form info 
app.get(`/api/admin/reservations/:year/:month`, async(req, res) => {
    try{ 
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month)-1;

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const bookings = await Booking.find({
            bookingDate:{
                $gte: startDate, 
                $lte: endDate
            }
        }).sort({ bookingDate: 1, startTime: 1})//sorting by date and time
            console.log(`Found${bookings.length}bookings for ${year}/${month +1}`);//helpfull with debuging
            res.json({
                success: true, 
                count: bookings.length,
                bookings: bookings.map(booking => ({
                    id: booking._id, 
                    guestName: booking.guestName, 
                    guestEmail: booking.guestEmail,
                    guestPhone: booking.guestPhone,
                    bookingDate: booking.bookingDate, 
                    startTime: booking.startTime, 
                    endTime: booking.endTime, 
                    status: booking.status,
                    formattedDate: booking.bookingDate.toLocaleDateString('en-US'),
                    formattedStartTime: booking.endTime.toLocaleTimeString('en-US', {hour: '2-digit',minute: '2-digit'}),
                    formatedEndTime: booking.endTime.toLocaleDateString('en-US', {hour:'2-digit', minute: '2-digit'})
                }))
            });
    }catch (error){
        console.error(`Error fetching admin reservations:`, error);
            res.status(500).json({
                success:false,
                message:error.message
            });
    }
});
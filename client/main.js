const API_BASE_URL = 'http://localhost:3000/api';

const API = { async checkAvailability(data, startTime, endTime){
  const response = await fetch(
    `${API_BASE_URL}/availability/${data.toISOString()}/${startTime.toISOString()}/${endTime.toISOString()}`
);
return await response.json();
},

async createBooking(bookingData){
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method:'POST',
    header:{'Content-Type': `application/json`},
    body: JSON.stringify(bookingData)
  });
  return await response.json();
},
//user reg
async registerUser(userData){
  const response = await fetch(`${API_BASE_URL}/user/register`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(userData)
  });
  return await response.json();
},
//loginfor users
async loginUser(credentials){
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method:'POST',
    header:{'Content-Type':'application/json'},
    body:JSON.stringify(credentials)
  })
  return await response.json();
}
};

//Booking function 
async function confirmBooking(){
  if(!selectedDate || !selectedTimeSlot || !formData.registration.name){
    alert('Please complette all required fields.');
    return;
  }
//check if time slot available
const availability = await API.checkAvailability(
  selectedDate,
  selectedTimeSlot.start,
  selectedTimeSlot.end
);

if(!availability.available){
  alert('This time slot is no longer availalble.Please choose another.');
  return;
}
// booking object
const bookingData = {
  guestName: formData.registration.name,
  guestEmail: formData.registration.email,
  guestPhone: formData.registration.phone,
  bookingDate:selectedDate,
  startTime:selectedTimeSlot.start,
  endTime:selectedTimeSlot.end
};

try{
  //save to MOngoDB
  const result = await API.createBooking(bookingData);
  if(result.success){
    alert(`
      Booking confirmed
      \nGuest:${formData.registration.name}
      \nEmail:${formData.registration.email}
      \nPhone:${formData.registration.phone}
      \nDate:${selectedDate.toDateString()}
      \nTime:${DateUtils.formatTime(selectedTimeSlot.start)}-
      ${DateUtils.formatTime(selectedTimeSlot.end)}
      \nBooking ID:${result.bookingId}
      `);
      resetBooking();
  }else{
    alert('Booking failed:' + result.message);
  }
}catch (error){
  console.error('Booking error:',error);
  alert('An error occurred. Please try again');
}
}
// Calendar State
let currentDate = new Date();//tracs what month/year is currently being displayed
let selectedDate = null;//stores the date selected
let selectedTimeSlot = null;//stores the time selected

// Configuration- centrilized settings for buisness hrs
const CONFIG = {
  businessHours: { start: 9, end: 18 },//9am- 6pm
  slotDuration: 90, // 90minutes long appointments 
  timeFormat: { hour: '2-digit', minute: '2-digit', hour12: true },//returns 09:00Am
  dateFormat: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }//returns day of the week, month and date, and year
};

// DOM Elements -  
const elements = {
  calendarGrid: document.getElementById('calendar-grid'),//the grid that display the calendar days
  currentMonth: document.getElementById('current-month'),//the h3 shows the current month/year 
  selectedDate: document.getElementById('selected-date'),//the span shows the selected date above time slots
  timeSlotsContainer: document.getElementById('time-slots-container'),//container for time slot button
  bookingSummary: document.getElementById('booking-summary'),// the summary section that apears after selection 
  summaryDate: document.getElementById('summary-date'),//daate display in summary 
  summaryTime: document.getElementById('summary-time')// time display in summary
};

//Form state management
let formData={
  login:{email:'',name:'',remember: false},
  registration:{name:'', email: '',phone: '',agree: false}
};

// Initialize Calendar - setsup the whole booking system
function initCalendar() {
  if (!validateElements()) {
    console.error('Calendar initialization failed: Missing DOM elements');
    return;
  }
  renderCalendar();//draws the initial calendar
  setupEventListeners();//makes nav button work
  setupFormHandlers();//helps manage the guest form
}
//Safety Check - makes sure all html elements exist beffore proceeding
function validateElements() {
  const requiredElements = ['calendarGrid', 'currentMonth', 'timeSlotsContainer'];
  const missingElements = requiredElements.filter(el => !elements[el]);
  
  if (missingElements.length > 0) {
    console.error('Missing required DOM elements:', missingElements);
    return false;
  }
  return true;
}
//Setupform
function setupFormHandlers(){
  //prevent form submition 
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('reg-form');
    if(loginForm){
      loginForm.addEventListener('submit', function(e){
        e.preventDefault();
      });
    }
    if(regForm){
      regForm.addEventListener('submit', function(e){
        e.preventDefault();
      });
    }
    //Button handlers
    const loginBtn = document.getElementById('login-btn');
    const regBtn = document.getElementById('reg-btn');
    
    if(loginBtn){
      loginBtn.addEventListener('click', handleLogin);
    }
    if(regBtn){
      regBtn.addEventListener('click', handleRegistration);
    }
}
//Event Setup- attaches click handlers to nav buttons
function setupEventListeners() {
  const prevButton = document.querySelector('.calendar-header button:first-child');
  const nextButton = document.querySelector('.calendar-header button:last-child');
  
  if (prevButton) prevButton.addEventListener('click', previousMonth);
  if (nextButton) nextButton.addEventListener('click', nextMonth);
}

// Date helper functions
const DateUtils = {
  //checks if two dates are the same
  isSameDay: (date1, date2) => date1.toDateString() === date2.toDateString(),
//Adds days to date
  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
//Adds months to date
  addMonths: (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  },
//conversts date to readable string (EX: Mon, Nov 6,2025)
  formatDate: (date, options = CONFIG.dateFormat) =>
    date.toLocaleDateString('default', options),
//convets time to readable string(EX: 09:00Am)
  formatTime: (date, options = CONFIG.timeFormat) => 
    date.toLocaleTimeString('en-US', options)
};
//form switching function
function showRegistrationForm(){
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('reg-form').style.display ='block';
  document.getElementById('booking-summary').style.display = 'none';
}

function showLoginForm(){
  document.getElementById('reg-form').style.display = 'none';
  document.getElementById('login-form').style.display ='block';
  document.getElementById('booking-summary').style.display = 'none';
}

//Form handler for login form
function handleLogin(){
  const email = document.getElementById('log-email').value;
  const name = document.getElementById('log-name').value;
  const remember = document.getElementById('remember').checked;
  //Store from data
  formData.login ={ email, name, remember};

  console.log('login attempt:', formData.login);

  console.log('Login attempt:', formData.login);
  alert('Login functionality would process here');

    //Show booking summary if date n time selected
    if(selectedDate && selectedTimeSlot){
      showBookingSummary();
    }
}    

function handleRegistration(){//gets inputs from Registrationforms
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-num').value;
  const agree = document.getElementById('agree').checked;

  //Store from data
  formData.registration = { name, email, phone, agree};

  console.log('Registration attempt:', formData.registration);
    alert('Registration would process here');
    //Afterregform , show booking summary 
    showBookingSummary();
} 

// Time slot generation- creating available time slots based on hrs
function generateTimeSlots(startTime, endTime, slotDuration) {
  const slots = [];
  let currentSlot = new Date(startTime);
  const end = new Date(endTime);
//Generates consecutive time slots 
  while (currentSlot < end) {
    const slotEnd = new Date(currentSlot.getTime() + (slotDuration * 60 * 1000));
    if (slotEnd <= end) {
      slots.push({
        start: new Date(currentSlot),
        end: slotEnd
      });
    }
    currentSlot = new Date(currentSlot.getTime() + (slotDuration * 60 * 1000));
  }
  return slots;
}

// Calendar rendering
function renderCalendar() {
  if (!elements.calendarGrid || !elements.currentMonth) return;
//Update month/year display  
  elements.currentMonth.textContent = DateUtils.formatDate(currentDate, { month: 'long', year: 'numeric' });
  elements.calendarGrid.innerHTML = '';// clear existing calendar

  createCalendarHeader();//Adds day names (Sun, Mon, Tues ect..)
  createCalendarDays();//Adds the acutal calendar days
}
//Header creation: buildss the day name headers for the calendar
function createCalendarHeader() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day-header';
    dayElement.textContent = day;
    elements.calendarGrid.appendChild(dayElement);
  });
}
//Day creation - builds all calendar day cells
function createCalendarDays() {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDay.getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);//normalizes to midnight for accurate comparisson
//Build calendar in three parts
  createPreviousMonthDays(firstDayOfWeek, currentDate);//Grayed-out days from previous month
  createCurrentMonthDays(lastDay, currentDate, today);//clickable days for current month
  createNextMonthDays();//grayed-out days from next month to fill the grid
}
//Previous month days- fill start of grid with days from previous month
function createPreviousMonthDays(firstDayOfWeek, currentDate) {
  const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    createDayElement(prevMonthLastDay - i, 'other-month');//grayed out , not clickable
  }
}
//Current Month days- create all days for the current month
function createCurrentMonthDays(lastDay, currentDate, today) {
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayElement = createDayElement(day, 'calendar-day');
    const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    thisDate.setHours(0, 0, 0, 0);
//disables past dates - they cant be clicked
    if (thisDate < today) {
      dayElement.classList.add('disabled');
    } else {
      //makes future dates clickable 
      dayElement.addEventListener('click', () => selectDate(thisDate));
    }
    //highlights is this is the selected date
    if (selectedDate && DateUtils.isSameDay(thisDate, selectedDate)) {
      dayElement.classList.add('selected');
    }
    //bold todays date
    if (DateUtils.isSameDay(thisDate, today)) {
      dayElement.style.fontWeight = 'bold';
    }
  }
}
//Next month Days- fills remaining grid spaces with next months days
function createNextMonthDays() {
  const totalCells = 42;// standard 6-week calendar grid(7days x 6weeks)
  const daysSoFar = elements.calendarGrid.children.length - 7;//subtracts header days
  
  if (daysSoFar < totalCells) {
    for (let day = 1; day <= totalCells - daysSoFar; day++) {
      createDayElement(day, 'other-month');// grays out , not clickable
    }
  }
}
//Day Element Factory- creates a single day element
function createDayElement(content, className) {
  const dayElement = document.createElement('div');
  dayElement.className = className;
  dayElement.textContent = content;
  elements.calendarGrid.appendChild(dayElement);
  return dayElement;
}

// Calendar Navigation
function previousMonth() {
  currentDate = DateUtils.addMonths(currentDate, -1);
  renderCalendar();
}
//Navigation- moves calendar to next month
function nextMonth() {
  currentDate = DateUtils.addMonths(currentDate, 1);
  renderCalendar();//redraws calendar with new month
}

// Date Selection- handles when user clicks on a date 
function selectDate(date) {
  selectedDate = date;//store the selected date
  selectedTimeSlot = null;//clear any previous selected time

  updateSelectedDateDisplay();//Update "Selected date" text
  generateTimeSlotsForDate(date);//Shows available time slots
  hideBookingSummary();//Hides summary until time is selected
  renderCalendar();//Refreshes calendar to show selected date highlighted
}
//update display- show the selected date above time slots
function updateSelectedDateDisplay() {
  if (elements.selectedDate) {
    elements.selectedDate.textContent = DateUtils.formatDate(selectedDate);
  }
}
//hides booking summary
function hideBookingSummary() {
  if (elements.bookingSummary) {
    elements.bookingSummary.style.display = 'none';
  }
}

// Generate time slots for selected date
function getTimeSlotsForDate(date) {
  const startTime = new Date(date);
  startTime.setHours(CONFIG.businessHours.start, 0, 0, 0);//shows  9:00 am

  const endTime = new Date(date);
  endTime.setHours(CONFIG.businessHours.end, 0, 0, 0);// shows 6:00pm

  return generateTimeSlots(startTime, endTime, CONFIG.slotDuration);
}
//Display time slots - shows available time slots for selected date
function generateTimeSlotsForDate(date) {
  if (!elements.timeSlotsContainer) return;
  
  elements.timeSlotsContainer.innerHTML = '';// clear existing time slots
  const slots = getTimeSlotsForDate(date);
  
  if (slots.length === 0) {
    elements.timeSlotsContainer.innerHTML = '<p>No available slots for this date.</p>';
    return;
  }
 //create a clickable button for each time slot 
  slots.forEach(slot => createTimeSlotElement(slot));
}
//Time slot creation - create a clickable time slot element
function createTimeSlotElement(slot) {
  const slotElement = document.createElement('div');
  slotElement.className = 'time-slot';
  slotElement.textContent = `${DateUtils.formatTime(slot.start)} - ${DateUtils.formatTime(slot.end)}`;
  slotElement.addEventListener('click', () => selectTimeSlot(slot, slotElement));
  elements.timeSlotsContainer.appendChild(slotElement);
  return slotElement;
}

// Time slot selection
function selectTimeSlot(slot, element) {
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  //highlights the selected time slot
  element.classList.add('selected');
  selectedTimeSlot = slot;//stores selected time
  showRegistrationForm();// show the booking confirmation section
}

//Shows summary - display booking summary with selected date and time
function showBookingSummary() {
  if (!elements.bookingSummary || !elements.summaryDate || !elements.summaryTime) return;
  
  elements.summaryDate.textContent = DateUtils.formatDate(selectedDate);
  elements.summaryTime.textContent = 
    `${DateUtils.formatTime(selectedTimeSlot.start)} - ${DateUtils.formatTime(selectedTimeSlot.end)}`;
  
  elements.bookingSummary.style.display = 'block';//Make summary visible
}

// Confirm booking- finalize the reservation
 async function confirmBooking() {
  if (!selectedDate || !selectedTimeSlot) return;//Safty check
  //Check if  user is registered or login
  if(!formData.registration.name || formData.registration.name.trim()===''){
    alert('please register to compleate your reservation');
    showRegistrationForm();
  return;
  }

  //crete confirmation message
  const bookingDetails = `
Booking confirmed!
Guest:${formData.registration.name}
Email:${formData.registration.email}
Phone:${formData.registration.phone}
Date: ${selectedDate.toDateString()}
Time: ${DateUtils.formatTime(selectedTimeSlot.start)} - ${DateUtils.formatTime(selectedTimeSlot.end)}
  `.trim();
  
  alert(bookingDetails);//Show configuration popup
  resetBooking();//Clear selections and reset interface
}
//Reset system- clear all selections and return to initial state
function resetBooking() {
  selectedDate = null;
  selectedTimeSlot = null;

  hideBookingSummary();//hide summary section
  renderCalendar();//refresh calendar
//Resets display
  if (elements.selectedDate) {
    elements.selectedDate.textContent = 'Select a date';
  }
  if (elements.timeSlotsContainer) {
    elements.timeSlotsContainer.innerHTML = '';// clear time slots 
  }
  //Login form reset
  showLoginForm();
}

// Initialize the booking system 
document.addEventListener('DOMContentLoaded', initCalendar);

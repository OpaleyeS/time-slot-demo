
const API_BASE_URL = 'http://localhost:3000/api';

const API = { async checkAvailability(data, startTime, endTime){
  const response = await fetch(
    `${API_BASE_URL}/availability/${data.toISOString()}/${startTime.toISOString()}/${endTime.toISOString()}`
);
return await response.json();
},
async getReservationsForMonth(year, month) {
  try{
    const response = await fetch(
    `${API_BASE_URL}/reservations/${year}/${month}`
  );
  if(!response.ok){
    throw new Error(`HTTP error! status: ${response.status}`);
  }
    
  const data = await response.json();
  console.log('Fetched reservations:', data);
  return data;
} catch (error){
  console.error('Failed to fetch reservations:', error);
  return {success: false, bookings: [], error: error.message};
  }
  }
};

let currentDate = new Date();//tracs what month/year is currently being displayed
let selectedDate = null;//stores the date selected
let currentReservations = [];//Reservations array

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
};
//Templates - for cloning reservation cards and summary
const templates = {
  reservationBadge: document.getElementById('reservation-badge-template'),//template for the badge that shows number of reservations on a day
  reservationCard: document.getElementById('reservation-card-template'),//template for individual reservation details
  reervationSummary: document.getElementById('booking-summary'),// the summary section that apears after selection 
  dateHeader: document.getElementById('date-header-template'),//displays the selected date above the time slots 
  cardsContainer: document.getElementById('cards-container-template')//container for reservation cards in summary
};

function initAdmin() {
  if (!validateElements()) {
    console.error('Admin initialization failed: Missing DOM elements');
    return;
  }
  renderCalendar();//draws the initial calendar
  setupEventListeners();//makes nav button work  
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
  isSameDay: (date1, date2) => {
    if(!date1 || !date2) return false; 
      return date1.toDateString() === date2.toDateString();
  },
//Adds months to date
  addMonths: (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  },
//conversts date to readable string (EX: Mon, Nov 6,2025)
  formatDate: (date, options = {month: 'long', year: 'numeric'}) => {
    if(!date) return '';
      return date.toLocaleDateString('default', options);
  },
//convets time to readable string(EX: 09:00Am)
  formatTime: (date, options = CONFIG.timeFormat) => {
    if(!date) return '';
      return date.toLocaleTimeString('en-US', options)
  }
    };
//renders calander 
async function renderCalendar(){
  if(!elements.calendarGrid || !elements.currentMonth)return;
    // month/year display
    elements.currentMonth.textContent = DateUtils.formatDate(currentDate, {month: `long`, year: "numeric"});
      elements.calendarGrid.innerHTML = '';

      //fetch the reservations for this month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await API.getReservationsForMonth(year, month);

      if(result.success){
        currentReservations = result.bookings || [];
          console.log(`Loaded ${currentReservations.length} reservations for${month}/${year}`);
        } else{
          currentReservations = [];
          console.warn('Could not load reservations');
        }
        createCalendarHeader();
        createCalendarDays();
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
    for(let i = firstDayOfWeek - 1; i >= 0; i--){
        const dayElement = createDayElement(prevMonthLastDay - i, 'other-month');//grays out , not clickable
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() -1, prevMonthLastDay -i);
        const dayReservations = getReservationsForDate(date);
          if(dayReservations.length > 0){
              addReservationIndicator(dayElement, dayReservations.length);
          }
  }
}
//Current Month days- create all days for the current month
function createCurrentMonthDays(lastDay, currentDate, today) {
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayElement = createDayElement(day, 'calendar-day');
    const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    thisDate.setHours(0, 0, 0, 0);

    const dayReservations = getReservationsForDate(thisDate);
      if(dayReservations.length > 0){
        addReservationIndicator(dayElement, dayReservations.length);
        dayElement.classList.add('has-reservations');
        dayElement.setAttribute('date-reservation-count', dayReservations.length); 
        dayElement.addEventListener('click', () => showReservationsForDate(thisDate, dayReservations));
        dayElement.classList.add('clickable');
      }
//Makes days with reservations clickable with details 
    if (DateUtils.isSameDay(thisDate, today)) {
      dayElement.classList.add('today');
    }
    //Highlights curent date 
    if(thisDate < today){
      dayElement.classList.add('disabled');
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
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);

        //check to see if there are reservations on this date
        const dayReservations = getReservationsForDate(date);
          if(dayReservations.length > 0){
            addReservationIndicator(dayElement, dayReservations.length);
          }
    }
  }
}
//gets reservation for a specific date
function getReservationsForDate(date) {
  if(!currentReservations || currentReservations.length === 0) return [];
    return currentReservations.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
        return DateUtils.isSameDay(bookingDate, date);
    });
  }

// visual indication for reservations
function addReservationIndicator(dayElement, count) {
  if(dayElement.classList.contains(`calendar-day-header`))return;
  //Add class to style elements
  dayElement.classList.add('has-reservations');
  dayElement.setAttribute('data-reservation-count', count);
  //badge elements 
  const badge = document.createElement('span');
  badge.className = 'reservation-badge';
  badge.textContent = count;
    //daynumber and badge
    const dayNumber = dayElement.textContent;
      dayElement.textContent = '';
      dayElement.appendChild(document.createTextNode(dayNumber));
      dayElement.appendChild(badge);
}

function createDayElement(content, className) {
  const dayElement = document.createElement('div');
    dayElement.className = className;
    dayElement.textContent = content;
    elements.calendarGrid.appendChild(dayElement);
    return dayElement;
}

// Date Selection- handles when user clicks on a date 
function previousMonth() {
  currentDate = DateUtils.addMonths(currentDate, -1);
  renderCalendar();
}
function nextMonth() {
  currentDate = DateUtils.addMonths(currentDate, 1);
    renderCalendar();
}

function showReservationsForDate(date, reservations) {
  selectedDate = date;
    if(!elements.timeSlotsContainer) return;
      elements.timeSlotsContainer.innerHTML = '';
      elements.timeSlotsContainer.classList.add('has-reservations');

      if(templates.dateHeader){
        const header = templates.dateHeader.content.cloneNode(true).querySelector('.reservation-date-header');
        header.textContent = `Reservations for ${date.toLocaleDateString('en-US', {
          weekday:'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}`;
        elements.timeSlotsContainer.appendChild(header);
      }
          if(reservations.length === 0){
            const emptyMessage = document.createElement('p');
            emptyMessage.className ='no-reservations-message';
            emptyMessage.textContent = 'No reservations for this date';
            elements.timeSlotsContainer.appendChild(emptyMessage);
            return;
        }
 if(templates.cardsContainer){
  const cardsContainer = templates.cardsContainer.content.cloneNode(true).querySelector('.reservation-cards-container');
//Containers for reservation cards

  reservations.forEach((booking, index) => {
    if(templates.reservationCard){
       const bookingCard = templates.reservationCard.content.cloneNode(true).querySelector('.reservation-card');
        const startTime = booking.formattedStartTime || DateUtils.formatTime(new Date (booking.startTime));
          const endTime = booking.formattedEndTime || DateUtils.formatTime(new Date(booking.endTime));
            const status = booking.status || 'confirmed';
              const statusClass = `status-${status.toLowerCase()}`;

        bookingCard.querySelector('.reservation-number').textContent = `${index + 1}.`
        bookingCard.querySelector('.guest-name').textContent = booking.guestName || 'Guest';
  
        const statusBadge = bookingCard.querySelector('.reservation-status');
          statusBadge.textContent = status;
          statusBadge.classList.add(statusClass);
          bookingCard.querySelector('.time-value').textContent = `${startTime} - ${endTime}`;
          bookingCard.querySelector('.contact-email').textContent = `${booking.guestEmail || 'No email'}`;
          bookingCard.querySelector('.contact-phone').textContent = `${booking.guestPhone || 'No phone'}`;
          bookingCard.setAttribute('data-booking-id', booking.id || booking._id);
          cardsContainer.appendChild(bookingCard);  
     }       
  });
elements.timeSlotsContainer.appendChild(cardsContainer);
   }
   if(templates.reervationSummary){
      const summary = templates.reervationSummary.content.cloneNode(true).querySelector('.reservation-summary');
      summary.querySelector('.total-count').textContent = `Total : ${reservations.length}reservation(s)`;
        const exportBtn = summary.querySelector('.export-btn');
          exportBtn.addEventListener('click', () => {
            console.log('Export reservations:', reservations);
      });
      elements.timeSlotsContainer.appendChild(summary);
    }
  }
document.addEventListener('DOMContentLoaded', initAdmin);

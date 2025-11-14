
// Calendar State
let currentDate = new Date();
let selectedDate = null;
let selectedTimeSlot = null;

// Configuration
const CONFIG = {
  businessHours: { start: 9, end: 18 },
  slotDuration: 90, // minutes
  timeFormat: { hour: '2-digit', minute: '2-digit', hour12: true },
  dateFormat: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
};

// DOM Elements 
const elements = {
  calendarGrid: document.getElementById('calendar-grid'),
  currentMonth: document.getElementById('current-month'),
  selectedDate: document.getElementById('selected-date'),
  timeSlotsContainer: document.getElementById('time-slots-container'),
  bookingSummary: document.getElementById('booking-summary'),
  summaryDate: document.getElementById('summary-date'),
  summaryTime: document.getElementById('summary-time')
};

// Initialize Calendar
function initCalendar() {
  if (!validateElements()) {
    console.error('Calendar initialization failed: Missing DOM elements');
    return;
  }
  renderCalendar();
  setupEventListeners();
}

function validateElements() {
  const requiredElements = ['calendarGrid', 'currentMonth', 'timeSlotsContainer'];
  const missingElements = requiredElements.filter(el => !elements[el]);
  
  if (missingElements.length > 0) {
    console.error('Missing required DOM elements:', missingElements);
    return false;
  }
  return true;
}

function setupEventListeners() {
  const prevButton = document.querySelector('.calendar-header button:first-child');
  const nextButton = document.querySelector('.calendar-header button:last-child');
  
  if (prevButton) prevButton.addEventListener('click', previousMonth);
  if (nextButton) nextButton.addEventListener('click', nextMonth);
}

// Date helper functions
const DateUtils = {
  isSameDay: (date1, date2) => date1.toDateString() === date2.toDateString(),

  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  addMonths: (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  },

  formatDate: (date, options = CONFIG.dateFormat) =>
    date.toLocaleDateString('default', options),

  formatTime: (date, options = CONFIG.timeFormat) => 
    date.toLocaleTimeString('en-US', options)
};

// Time slot generation
function generateTimeSlots(startTime, endTime, slotDuration) {
  const slots = [];
  let currentSlot = new Date(startTime);
  const end = new Date(endTime);

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
  
  elements.currentMonth.textContent = DateUtils.formatDate(currentDate, { month: 'long', year: 'numeric' });
  elements.calendarGrid.innerHTML = '';

  createCalendarHeader();
  createCalendarDays();
}

function createCalendarHeader() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day-header';
    dayElement.textContent = day;
    elements.calendarGrid.appendChild(dayElement);
  });
}

function createCalendarDays() {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDay.getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  createPreviousMonthDays(firstDayOfWeek, currentDate);
  createCurrentMonthDays(lastDay, currentDate, today);
  createNextMonthDays();
}

function createPreviousMonthDays(firstDayOfWeek, currentDate) {
  const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    createDayElement(prevMonthLastDay - i, 'other-month');
  }
}

function createCurrentMonthDays(lastDay, currentDate, today) {
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayElement = createDayElement(day, 'calendar-day');
    const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    thisDate.setHours(0, 0, 0, 0);

    if (thisDate < today) {
      dayElement.classList.add('disabled');
    } else {
      dayElement.addEventListener('click', () => selectDate(thisDate));
    }

    if (selectedDate && DateUtils.isSameDay(thisDate, selectedDate)) {
      dayElement.classList.add('selected');
    }

    if (DateUtils.isSameDay(thisDate, today)) {
      dayElement.style.fontWeight = 'bold';
    }
  }
}

function createNextMonthDays() {
  const totalCells = 42;
  const daysSoFar = elements.calendarGrid.children.length - 7;
  
  if (daysSoFar < totalCells) {
    for (let day = 1; day <= totalCells - daysSoFar; day++) {
      createDayElement(day, 'other-month');
    }
  }
}

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

function nextMonth() {
  currentDate = DateUtils.addMonths(currentDate, 1);
  renderCalendar();
}

// Date Selection
function selectDate(date) {
  selectedDate = date;
  selectedTimeSlot = null;

  updateSelectedDateDisplay();
  generateTimeSlotsForDate(date);
  hideBookingSummary();
  renderCalendar();
}

function updateSelectedDateDisplay() {
  if (elements.selectedDate) {
    elements.selectedDate.textContent = DateUtils.formatDate(selectedDate);
  }
}

function hideBookingSummary() {
  if (elements.bookingSummary) {
    elements.bookingSummary.style.display = 'none';
  }
}

// Generate time slots for selected date
function getTimeSlotsForDate(date) {
  const startTime = new Date(date);
  startTime.setHours(CONFIG.businessHours.start, 0, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(CONFIG.businessHours.end, 0, 0, 0);

  return generateTimeSlots(startTime, endTime, CONFIG.slotDuration);
}

function generateTimeSlotsForDate(date) {
  if (!elements.timeSlotsContainer) return;
  
  elements.timeSlotsContainer.innerHTML = '';
  const slots = getTimeSlotsForDate(date);
  
  if (slots.length === 0) {
    elements.timeSlotsContainer.innerHTML = '<p>No available slots for this date.</p>';
    return;
  }
  
  slots.forEach(slot => createTimeSlotElement(slot));
}

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
  
  element.classList.add('selected');
  selectedTimeSlot = slot;
  showBookingSummary();
}

function showBookingSummary() {
  if (!elements.bookingSummary || !elements.summaryDate || !elements.summaryTime) return;
  
  elements.summaryDate.textContent = DateUtils.formatDate(selectedDate);
  elements.summaryTime.textContent = 
    `${DateUtils.formatTime(selectedTimeSlot.start)} - ${DateUtils.formatTime(selectedTimeSlot.end)}`;
  
  elements.bookingSummary.style.display = 'block';
}

// Confirm booking
function confirmBooking() {
  if (!selectedDate || !selectedTimeSlot) return;
  
  const bookingDetails = `
Booking confirmed!

Date: ${selectedDate.toDateString()}
Time: ${DateUtils.formatTime(selectedTimeSlot.start)} - ${DateUtils.formatTime(selectedTimeSlot.end)}
  `.trim();
  
  alert(bookingDetails);
  resetBooking();
}

function resetBooking() {
  selectedDate = null;
  selectedTimeSlot = null;

  hideBookingSummary();
  renderCalendar();

  if (elements.selectedDate) {
    elements.selectedDate.textContent = 'Select a date';
  }
  if (elements.timeSlotsContainer) {
    elements.timeSlotsContainer.innerHTML = '';
  }
}

// Initialize the booking system 
document.addEventListener('DOMContentLoaded', initCalendar);
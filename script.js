document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.getElementById('timeline-container');
    const yearDisplay = document.getElementById('year-display');

    if (!timelineContainer || !yearDisplay) {
        console.error('Required elements not found!');
        return;
    }

    function parseDate(dateString) {
        const lowerCaseDate = dateString.toLowerCase();
        const currentYear = new Date().getFullYear();

        if (lowerCaseDate.includes('billion years ago')) {
            return parseFloat(lowerCaseDate) * 1e9;
        }
        if (lowerCaseDate.includes('million years ago')) {
            return parseFloat(lowerCaseDate) * 1e6;
        }
        if (lowerCaseDate.includes('years ago')) {
            return parseInt(lowerCaseDate);
        }
        if (lowerCaseDate.includes('bce')) {
            const year = parseInt(lowerCaseDate.replace('bce', '').trim());
            return year + currentYear;
        }
        if (lowerCaseDate.includes('ce')) {
            const yearText = lowerCaseDate.replace(/c\.\s*|ce|\(projected\)/g, '').trim();
            const year = parseInt(yearText);
            return currentYear - year;
        }
        // Fallback for simple years like "1928"
        const year = parseInt(dateString);
        if (!isNaN(year)) {
             return currentYear - year;
        }

        console.warn('Could not parse date:', dateString);
        return 0;
    }

    const events = timelineData.map(event => ({
        ...event,
        years_ago: parseDate(event.date_string)
    })).sort((a, b) => a.years_ago - b.years_ago); // Sort from most recent to oldest

    const oldestEventYears = events[events.length - 1].years_ago;
    const mostRecentEventYears = -1; // Represents the future / present day

    const SCROLL_MULTIPLIER = 400; // Adjust this to control "zoom"

    // Use a logarithmic scale. Add 1 to avoid log(0) issues.
    const yearToPixel = (years_ago) => {
        if (years_ago <= 0) { // Handle present/future cases
            return Math.log(oldestEventYears + 1) * SCROLL_MULTIPLIER;
        }
        const totalHeight = Math.log(oldestEventYears + 1) * SCROLL_MULTIPLIER;
        return totalHeight - (Math.log(years_ago + 1) * SCROLL_MULTIPLIER);
    };

    const pixelToYear = (pixels) => {
        const totalHeight = Math.log(oldestEventYears + 1) * SCROLL_MULTIPLIER;
        const logValue = (totalHeight - pixels) / SCROLL_MULTIPLIER;
        return Math.exp(logValue) - 1;
    };

    // Calculate the total height of the timeline
    const timelineHeight = yearToPixel(mostRecentEventYears);
    timelineContainer.style.height = `${timelineHeight}px`;

    // Store the pixel position for each event for efficient access later
    events.forEach(event => {
        event.pixelPosition = yearToPixel(event.years_ago);
    });

    let visibleEvents = new Map(); // Use a Map to track DOM nodes by event description

    function createEventElement(event) {
        const eventEl = document.createElement('div');
        const eraClassName = `era-${event.era.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        eventEl.className = `event ${eraClassName}`;
        eventEl.style.top = `${event.pixelPosition}px`;

        const side = events.indexOf(event) % 2 === 0 ? 'right' : 'left';
        if (side === 'left') {
            eventEl.style.transform = 'translateX(calc(-100% - 30px))';
        } else {
            eventEl.style.transform = 'translateX(30px)';
        }

        eventEl.innerHTML = `
            <div class="event-marker"></div>
            <div class="event-info">
                <div class="era-title">${event.era}</div>
                <h3>${event.description}</h3>
                <p>${event.date_string}</p>
            </div>
        `;
        return eventEl;
    }

    function updateVisibleEvents() {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const buffer = viewportHeight; // Render events in a buffer zone above and below the viewport

        const visibleStart = scrollTop - buffer;
        const visibleEnd = scrollTop + viewportHeight + buffer;

        const eventsToDisplay = events.filter(event =>
            event.pixelPosition >= visibleStart && event.pixelPosition <= visibleEnd
        );

        const newVisibleEvents = new Map();
        eventsToDisplay.forEach(event => {
            newVisibleEvents.set(event.description, event);
        });

        // Remove events that are no longer visible
        for (const [key, node] of visibleEvents.entries()) {
            if (!newVisibleEvents.has(key)) {
                timelineContainer.removeChild(node);
                visibleEvents.delete(key);
            }
        }

        // Add new events that have become visible
        for (const [key, event] of newVisibleEvents.entries()) {
            if (!visibleEvents.has(key)) {
                const eventEl = createEventElement(event);
                timelineContainer.appendChild(eventEl);
                visibleEvents.set(key, eventEl);
            }
        }
    }

    function formatYear(years_ago) {
        const currentYear = new Date().getFullYear();
        if (years_ago <= -1) {
            return `${currentYear + Math.abs(Math.round(years_ago))} CE (Projected)`;
        }
        if (years_ago < (currentYear - 1)) {
            return `${currentYear - Math.round(years_ago)} CE`;
        }
        if (years_ago < 10000) { // e.g. 8000 BCE
            return `${Math.round(years_ago - currentYear)} BCE`;
        }
        if (years_ago < 1e6) { // e.g. 50,000 Years Ago
            return `${Math.round(years_ago / 1000) * 1000} Years Ago`;
        }
        if (years_ago < 1e9) { // e.g. 2.5 Million Years Ago
            return `${(years_ago / 1e6).toFixed(2)} Million Years Ago`;
        }
        return `${(years_ago / 1e9).toFixed(2)} Billion Years Ago`;
    }

    function handleScroll() {
        // This function will now handle both rendering and animations
        updateVisibleEvents();

        const centerLine = window.scrollY + window.innerHeight / 2;

        // Update year display
        const centerYear = pixelToYear(centerLine);
        yearDisplay.textContent = formatYear(centerYear);

        // Find the event closest to the center line and activate it.
        let closestEventNode = null;
        let minDistance = Infinity;

        for (const [key, node] of visibleEvents.entries()) {
            const nodeTop = parseFloat(node.style.top);
            const distanceToCenter = Math.abs(centerLine - nodeTop);

            if (distanceToCenter < minDistance) {
                minDistance = distanceToCenter;
                closestEventNode = node;
            }
            // Deactivate all nodes initially
            node.classList.remove('active');
        }

        // Activate only the closest one if it's within a reasonable zone
        const activationZone = window.innerHeight / 2;
        if (closestEventNode && minDistance < activationZone) {
            closestEventNode.classList.add('active');
        }
    }

    // Initial render and setup scroll listener
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call to populate and set everything up

    // Scroll to the top to start at the earliest point in history
    window.scrollTo(0, 0);

    console.log('Interactive timeline enabled.');
});

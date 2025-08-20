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

    const modernEraName = "Technological Revolution & The Great Acceleration";

    const allMappedEvents = timelineData.map(event => ({
        ...event,
        years_ago: parseDate(event.date_string)
    }));

    // We need the oldest event from the entire dataset to set the scale correctly
    const sortedForAge = [...allMappedEvents].sort((a, b) => a.years_ago - b.years_ago);
    const oldestEventYears = sortedForAge[sortedForAge.length - 1].years_ago;

    // Separate events into two groups for different rendering logic
    const legacyEvents = allMappedEvents
        .filter(event => event.era !== modernEraName)
        .sort((a, b) => a.years_ago - b.years_ago);

    const modernEvents = allMappedEvents
        .filter(event => event.era === modernEraName)
        .sort((a, b) => a.years_ago - b.years_ago);

    const events = legacyEvents; // The old rendering logic will now only use legacyEvents
    const modernEraGrid = document.getElementById('modern-era-grid');
    const mostRecentEventYears = -1; // Represents the future / present day

    const SCROLL_MULTIPLIER = 400; // Adjust this to control "zoom"

    // Use a logarithmic scale. Add 1 to avoid log(0) issues.
    const yearToPixel = (years_ago) => {
        const totalHeight = Math.log(oldestEventYears + 1) * SCROLL_MULTIPLIER;
        return totalHeight - (Math.log(years_ago + 1) * SCROLL_MULTIPLIER);
    };

    const pixelToYear = (pixels) => {
        const totalHeight = Math.log(oldestEventYears + 1) * SCROLL_MULTIPLIER;
        return Math.exp((totalHeight - pixels) / SCROLL_MULTIPLIER) - 1;
    };

    // Calculate pixel positions only for legacy events which are positioned absolutely
    legacyEvents.forEach(event => {
        event.pixelPosition = yearToPixel(event.years_ago);
    });

    // Position the modern era grid container to appear after the last legacy event
    if (legacyEvents.length > 0) {
        const lastLegacyEventPosition = legacyEvents[0].pixelPosition; // Most recent legacy event
        console.log('Positioning modern grid at top:', lastLegacyEventPosition + 200);
        modernEraGrid.style.position = 'absolute';
        modernEraGrid.style.top = `${lastLegacyEventPosition + 200}px`; // Margin
        modernEraGrid.style.width = '100%';
    }

    // Populate the grid with modern events
    modernEvents.forEach(event => {
        const card = document.createElement('div');
        const eraClassName = `era-${event.era.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        card.className = `modern-event-card ${eraClassName}`;
        card.innerHTML = `
            <div class="event-info">
                <h3>${event.description}</h3>
                <p>${event.date_string}</p>
            </div>
        `;
        modernEraGrid.appendChild(card);
    });

    // Defer the final height calculation to allow the browser to render the grid first
    setTimeout(() => {
        const gridTop = modernEraGrid.offsetTop;
        const gridHeight = modernEraGrid.offsetHeight;
        const totalTimelineHeight = gridTop + gridHeight;
        timelineContainer.style.height = `${totalTimelineHeight + window.innerHeight}px`;
        console.log('Final timeline height calculated:', timelineContainer.style.height);
        // Add a signal that the layout is complete for testing purposes
        document.body.setAttribute('data-timeline-ready', 'true');
    }, 0);

    console.log('Oldest event years:', oldestEventYears);
    console.log('Number of legacy events:', legacyEvents.length);
    console.log('Number of modern events:', modernEvents.length);

    let visibleEvents = new Map(); // Use a Map to track DOM nodes by event description

    function createEventElement(event) {
        const eventEl = document.createElement('div');
        const eraClassName = `era-${event.era.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        eventEl.className = `event ${eraClassName}`;
        eventEl.style.top = `${event.pixelPosition}px`;

        const side = legacyEvents.indexOf(event) % 2 === 0 ? 'right' : 'left';
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

        const eventsToDisplay = legacyEvents.filter(event =>
            event.pixelPosition >= visibleStart && event.pixelPosition <= visibleEnd
        );
        console.log(`Updating visible legacy events. Found: ${eventsToDisplay.length} in viewport.`);

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
        updateVisibleEvents();

        const centerLine = window.scrollY + window.innerHeight / 2;
        const activationZone = window.innerHeight / 2; // The "hot zone" for scaling

        // Update year display
        const centerYear = pixelToYear(centerLine);
        yearDisplay.textContent = formatYear(centerYear);

        visibleEvents.forEach(node => {
            const nodeTop = parseFloat(node.style.top);
            const distanceToCenter = Math.abs(centerLine - nodeTop);

            const eventInfo = node.querySelector('.event-info');
            const eventMarker = node.querySelector('.event-marker');

            if (distanceToCenter < activationZone) {
                // The event is in the "hot zone"
                const proximity = distanceToCenter / activationZone; // 0 at center, 1 at edge
                const scale = 0.5 + (1 - proximity) * 0.7; // Scale from 1.2 at center to 0.5 at edge

                eventInfo.style.opacity = 1;
                eventInfo.style.transform = `scale(${scale})`;
                eventMarker.style.transform = `translateY(-50%) scale(${scale})`;
                node.classList.add('active');
            } else {
                // The event is outside the "hot zone"
                eventInfo.style.opacity = 0;
                eventInfo.style.transform = 'scale(0.5)';
                eventMarker.style.transform = 'translateY(-50%) scale(0)';
                node.classList.remove('active');
            }
        });
    }

    // Initial render and setup scroll listener
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call to populate and set everything up

    // Scroll to the top to start at the earliest point in history
    window.scrollTo(0, 0);

    console.log('Interactive timeline enabled.');
});

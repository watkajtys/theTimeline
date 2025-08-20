document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) {
        console.error('Timeline container not found!');
        return;
    }

    function calculateYearsAgo(dateString) {
        const currentYear = new Date().getFullYear();
        if (dateString.includes('Billion years ago')) {
            return parseFloat(dateString) * 1000000000;
        }
        if (dateString.includes('Million years ago')) {
            return parseFloat(dateString) * 1000000;
        }
        if (dateString.includes('years ago')) {
            return parseInt(dateString);
        }
        if (dateString.includes('BCE')) {
            const year = parseInt(dateString.replace('BCE', '').trim());
            return year + currentYear;
        }
        if (dateString.includes('CE')) {
            const yearText = dateString.replace('c. ', '').replace('CE', '').replace('(Projected)', '').trim();
            const year = parseInt(yearText);
            return currentYear - year;
        }
        return 0;
    }

    timelineData.forEach(event => {
        event.years_ago = calculateYearsAgo(event.date_string);
    });

    // Define colors for eras for better visualization
    const eraColors = {
        "Pre-Human Era": "#d4e157",
        "Human Evolution": "#ffca28",
        "Hunter-Gatherer Society": "#ff7043",
        "Agricultural Revolution": "#8d6e63",
        "Empires & Conquests": "#bcaaa4",
        "The Post-Classical Era": "#a1887f",
        "Scientific Revolution": "#78909c",
        "Industrial Revolution": "#546e7a",
        "Technological Revolution & The Great Acceleration": "#455a64",
    };

    // Reverse the data to process from past to present
    const sortedTimelineData = [...timelineData].reverse();

    const eras = sortedTimelineData.reduce((acc, event) => {
        if (!acc[event.era]) {
            acc[event.era] = {
                events: [],
                start: event.years_ago,
                end: event.years_ago,
                color: eraColors[event.era] || '#ccc'
            };
        }
        acc[event.era].events.push(event);
        acc[event.era].start = Math.min(acc[event.era].start, event.years_ago);
        acc[event.era].end = Math.max(acc[event.era].end, event.years_ago);
        return acc;
    }, {});

    const totalDuration = timelineData[0].years_ago; // The very first event in the original array

    for (const eraName in eras) {
        const era = eras[eraName];
        const eraDuration = era.end - era.start;
        const eraWidth = (eraDuration / totalDuration) * 100;

        const eraBlock = document.createElement('div');
        eraBlock.classList.add('era');
        // Use a minimum width for very short eras to make them visible
        if (eraWidth < 0.1) {
            eraBlock.style.minWidth = '30px'; // A bit wider for visibility
        }
        eraBlock.style.width = `${eraWidth}%`;
        eraBlock.style.backgroundColor = era.color;
        eraBlock.title = eraName;

        let lastYearsAgo = -1;
        let overlapCount = 0;
        for (const event of era.events) {
            const eventMarker = document.createElement('div');
            eventMarker.classList.add('event-marker');

            if (event.years_ago === lastYearsAgo) {
                overlapCount++;
            } else {
                overlapCount = 0;
            }

            const positionInEra = eraDuration > 0 ? ((event.years_ago - era.start) / eraDuration) * 100 : 50;
            eventMarker.style.left = `${positionInEra}%`;

            // Stagger markers that have the same year
            eventMarker.style.bottom = `${10 + (overlapCount * 25)}px`;

            eventMarker.title = `${event.description} (${event.date_string})`;

            // Store data on the element for the popup
            eventMarker.dataset.description = event.description;
            eventMarker.dataset.date = event.date_string;

            eraBlock.appendChild(eventMarker);
            lastYearsAgo = event.years_ago;
        }
        timelineContainer.appendChild(eraBlock);
    }

    // Popup logic
    const popupContainer = document.getElementById('popup-container');
    const popupTitle = document.getElementById('popup-title');
    const popupDate = document.getElementById('popup-date');
    const popupDescription = document.getElementById('popup-description');
    const closePopupButton = document.getElementById('close-popup');

    if (popupContainer && popupTitle && popupDate && popupDescription && closePopupButton) {
        timelineContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('event-marker')) {
                const marker = e.target;
                popupTitle.textContent = marker.dataset.description;
                popupDate.textContent = marker.dataset.date;
                popupDescription.textContent = ""; // Clear previous description
                popupContainer.classList.remove('hidden');
            }
        });

        closePopupButton.addEventListener('click', () => {
            popupContainer.classList.add('hidden');
        });

        popupContainer.addEventListener('click', (e) => {
            if (e.target === popupContainer) {
                popupContainer.classList.add('hidden');
            }
        });
    }

    // Zoom logic using Intersection Observer for better performance
    const industrialRevolutionEra = Array.from(timelineContainer.children).find(child => child.title === 'Industrial Revolution');
    if (industrialRevolutionEra) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    timelineContainer.classList.add('zoomed');
                } else {
                    // Optional: remove zoom when scrolling away.
                    // For this project, we'll keep it zoomed once triggered for simplicity.
                }
            });
        }, { threshold: 0.01 }); // Trigger when 1% of the element is visible

        observer.observe(industrialRevolutionEra);
    }
});

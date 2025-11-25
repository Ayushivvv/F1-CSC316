document.addEventListener("DOMContentLoaded", () => {
    const audio = document.getElementById("bgAudio");
    const toggleBtn = document.getElementById("audioToggle");
    const iconSpan = document.getElementById("audioIcon");
    const labelSpan = document.getElementById("audioLabel");

    let isPlaying = false;

    function updateUI() {
        if (isPlaying) {
            iconSpan.textContent = "⏸";
            labelSpan.textContent = "Pause Music";
        } else {
            iconSpan.textContent = "▶";
            labelSpan.textContent = "Play Music";
        }
    }

    async function tryPlay() {
        try {
            await audio.play();
            isPlaying = true;
            updateUI();
        } catch (err) {
            // Autoplay probably blocked; will start on first user interaction
            isPlaying = false;
            updateUI();
        }
    }

    // Try to autoplay as soon as the page loads
    tryPlay();

    // Fallback: start playing on first interaction if autoplay is blocked
    const interactionEvents = ["click", "scroll", "keydown", "touchstart"];

    function handleFirstInteraction() {
        if (!isPlaying) {
            tryPlay();
        }
        interactionEvents.forEach(evt =>
            window.removeEventListener(evt, handleFirstInteraction)
        );
    }

    interactionEvents.forEach(evt =>
        window.addEventListener(evt, handleFirstInteraction, { once: true })
    );

    // Toggle button for play / pause
    toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
        } else {
            tryPlay();
        }
        updateUI();
    });

    // Sync with actual audio events (in case something else pauses it)
    audio.addEventListener("play", () => {
        isPlaying = true;
        updateUI();
    });

    audio.addEventListener("pause", () => {
        isPlaying = false;
        updateUI();
    });
});
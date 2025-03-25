<script lang="ts">
    import { onDestroy } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';

    let minutes = 25;
    let seconds = 0;
    let isRunning = false;
    let isWorkTime = true;
    let interval: ReturnType<typeof setInterval>;

    const totalSeconds = tweened(0, {
        duration: 1000,
        easing: cubicOut
    });

    $: {
        const current = minutes * 60 + seconds;
        const total = isWorkTime ? 25 * 60 : 5 * 60;
        $totalSeconds = 1 - (current / total);
    }

    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            interval = setInterval(() => {
                if (seconds === 0) {
                    if (minutes === 0) {
                        clearInterval(interval);
                        isRunning = false;
                        // Switch between work and break
                        isWorkTime = !isWorkTime;
                        minutes = isWorkTime ? 25 : 5;
                        seconds = 0;
                        // Play sound when timer ends
                        new Audio('/notification.mp3').play().catch(() => {});
                    } else {
                        minutes--;
                        seconds = 59;
                    }
                } else {
                    seconds--;
                }
            }, 1000);
        }
    }

    function pauseTimer() {
        clearInterval(interval);
        isRunning = false;
    }

    function resetTimer() {
        clearInterval(interval);
        isRunning = false;
        minutes = isWorkTime ? 25 : 5;
        seconds = 0;
    }

    function toggleMode() {
        isWorkTime = !isWorkTime;
        minutes = isWorkTime ? 25 : 5;
        seconds = 0;
        isRunning = false;
        clearInterval(interval);
    }

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });

    $: formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
</script>

<div class="w-full bg-white rounded-lg border-2 border-black p-2">
    <div class="flex flex-col gap-4">
        <!-- Timer info and progress bar -->
        <div class="flex items-center gap-4">
            <div class="font-mono text-2xl font-bold text-gray-800 min-w-[80px]">
                {formattedTime}
            </div>
            
            <div class="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                    class="h-full transition-all duration-1000 rounded-full {isWorkTime ? 'bg-red-500' : 'bg-green-500'}"
                    style="width: {$totalSeconds * 100}%"
                ></div>
            </div>

            <div class="flex gap-2">
                <button
                    class="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                    on:click={isRunning ? pauseTimer : startTimer}
                >
                    {isRunning ? 'Pause' : 'Start'}
                </button>
                
                <button
                    class="px-4 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                    on:click={resetTimer}
                >
                    Reset
                </button>

                <button
                    class="px-4 py-1.5 text-sm {isWorkTime ? 'bg-red-500' : 'bg-green-500'} text-white rounded-md hover:opacity-90 transition-colors"
                    on:click={toggleMode}
                >
                    {isWorkTime ? 'Switch to Break' : 'Switch to Work'}
                </button>
            </div>
        </div>
    </div>
</div> 
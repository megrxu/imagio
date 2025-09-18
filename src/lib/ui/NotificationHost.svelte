<script lang="ts">
    import { notifications, type NotificationItem } from "./notifications";
    import { fade } from "svelte/transition";
    import { Cross2 } from "radix-icons-svelte";

    const levelStyles: Record<string, string> = {
        info: "bg-blue-600 text-white",
        success: "bg-green-600 text-white",
        error: "bg-red-600 text-white",
        warning: "bg-amber-500 text-white",
    };

    function close(id: string) {
        notifications.dismiss(id);
    }
</script>

<div
    class="fixed z-50 top-4 right-4 flex flex-col gap-3 w-80 max-w-[92vw] pointer-events-none"
>
    {#each $notifications as n (n.id)}
        <div
            in:fade
            out:fade
            class={`pointer-events-auto rounded-md shadow-md px-4 py-3 text-sm flex items-start gap-3 ${levelStyles[n.level]}`}
        >
            <div class="flex-1 break-words">{n.message}</div>
            <button
                class="opacity-70 hover:opacity-100"
                on:click={() => close(n.id)}
                title="Close"
            >
                <Cross2 />
            </button>
        </div>
    {/each}
</div>

<style>
    :global(body) {
        /* ensure space for pointer events layering if needed */
    }
</style>

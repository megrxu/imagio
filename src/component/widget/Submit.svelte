<script lang="ts">
    import { Spinner } from "flowbite-svelte";
    import { Check } from "radix-icons-svelte";
    export const action = "Uploading...";
    export const action_done = "Done.";
    export let done: Boolean = false;
</script>

<div class="w-full">
    <div class="w-full my-4 flex items-center">
        {#if done}
            <Check size={24} class="mr-4" />{action_done}
        {:else}
            <Spinner class="mr-4" size="6" color="gray" />{action}({done}/100)
        {/if}
    </div>
</div>

<script lang="ts">
    import { Loader, Flex } from "@svelteuidev/core";
    import { Check } from "radix-icons-svelte";
    export const action = "Uploading...";
    export const action_done = "Done.";
    export let done: Boolean = false;
</script>

<div class="w-full">
    <Flex class="w-full my-4">
        {#if done}
            <Check size={24} class="mr-4" />{action_done}
        {:else}
            <Loader size={48} class="mr-4" />{action}({done}/100)
        {/if}
    </Flex>
</div>

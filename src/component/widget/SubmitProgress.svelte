<script lang="ts">
    import { Spinner, Progressbar } from "flowbite-svelte";
    import { Check } from "radix-icons-svelte";
    export const action = "Uploading...";
    export const action_done = "Done.";
    export let doing: Boolean;
    export let done: number;
</script>

<div class="w-full">
    {#if doing}
        <div class="w-full my-4 flex items-center">
            {#if done < 100}
                <Spinner
                    class="mr-4"
                    size="6"
                    color="gray"
                />{action}({Math.round(done * 100) / 100}/100)
            {:else}
                <Check size={24} class="mr-4" />{action_done}
            {/if}
        </div>
        <div class="w-full my-4">
            <Progressbar progress={done} color="blue" size="h-2.5" />
        </div>
    {/if}
</div>

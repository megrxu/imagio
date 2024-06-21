<script lang="ts">
    import { Loader, Flex, Progress } from "@svelteuidev/core";
    import { Check } from "radix-icons-svelte";
    export const action = "Uploading...";
    export const action_done = "Done.";
    export let doing: Boolean;
    export let done: number;
</script>

<div class="w-full">
    {#if doing}
        <Flex class="w-full my-4">
            {#if done < 100}
                <Loader size={48} class="mr-4" />{action}({Math.round(
                    done * 100,
                ) / 100}/100)
            {:else}
                <Check size={24} class="mr-4" />{action_done}
            {/if}
        </Flex>
        <Progress class="w-full my-4" size="lg" tween value={done} />
    {/if}
</div>

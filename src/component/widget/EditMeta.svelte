<script lang="ts">
    import type { ImageMetaData } from "$lib/types";
    import { Input, Label } from "flowbite-svelte";

    export let meta: ImageMetaData;
    export let showCustomFields = false;
</script>

<div class="my-4 w-full card">
    <div class="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
        {#if showCustomFields}
            <div>
                <Label for="meta-name" class="mb-2">originalName</Label>
                <Input id="meta-name" bind:value={meta.originalName} class="w-full" />
            </div>
            <div>
                <Label for="meta-uploaded-at" class="mb-2">uploadedAt (ISO)</Label>
                <Input
                    id="meta-uploaded-at"
                    bind:value={meta.uploadedAt}
                    class="w-full"
                    placeholder="2026-01-01T00:00:00.000Z"
                />
            </div>
        {/if}
    </div>
</div>

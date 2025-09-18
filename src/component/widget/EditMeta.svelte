<script lang="ts">
    import type { ImageMetaData } from "$lib/types";
    import { _ } from "svelte-i18n";
    import Tags from "svelte-tags-input";
    import { Label, Select } from "flowbite-svelte";

    export let meta: ImageMetaData;
</script>

<div class="m-4 w-full card">
    <div class="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <Label for="meta-category" class="mb-2">{$_("term.category")}</Label
            >
            <Select
                id="meta-category"
                bind:value={meta.category}
                class="w-full"
            >
                <option value="public">public</option>
                <option value="private">private</option>
            </Select>
        </div>
        <div>
            <Label for="meta-tags" class="mb-2">{$_("term.tag")}</Label>
            <div class="w-full">
                <Tags
                    id="meta-tags"
                    aria-label={$_("term.tag")}
                    bind:tags={meta.tags}
                />
            </div>
        </div>
    </div>
</div>

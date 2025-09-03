<script lang="ts">
    import type { ImageMetaData } from "$lib/types";
    import { NativeSelect, InputWrapper, Flex } from "@svelteuidev/core";
    import { _ } from "svelte-i18n";
    import { Center, Grid, Checkbox, Button, Tooltip } from "@svelteuidev/core";

    export let meta: ImageMetaData;

    function handleTagsInput(e: Event) {
        const target = e.target as HTMLInputElement | null;
        if (target) {
            meta.tags = target.value.split(',').map(t => t.trim()).filter(Boolean);
        }
    }
</script>

<Grid class="m-8 w-full" justify="center">
    <Grid.Col sm={12} md={6} lg={3}>
        <NativeSelect
            data={["public", "private"]}
            placeholder={meta.category}
            label={$_("term.category")}
            bind:value={meta.category}
        />
    </Grid.Col>
    <Grid.Col sm={12} md={6} lg={3}>
        <InputWrapper class="child:bg-red" label={$_("term.tag")}>
                <input
                    type="text"
                    placeholder="tag1,tag2,tag3"
                    value={meta.tags?.join(',')}
                    on:input={handleTagsInput}
                />
        </InputWrapper>
    </Grid.Col>
</Grid>

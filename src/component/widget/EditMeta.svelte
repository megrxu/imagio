<script lang="ts">
    import type { ImageMetaData } from "$lib/types";
    import { NativeSelect, InputWrapper, Flex } from "@svelteuidev/core";
    import { _ } from "svelte-i18n";
    import Tags from "svelte-tags-input";
    import { Center, Grid, Checkbox, Button, Tooltip } from "@svelteuidev/core";

    export let meta: ImageMetaData;
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
            <Tags bind:tags={meta.tags} />
        </InputWrapper>
    </Grid.Col>
</Grid>

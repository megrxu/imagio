<script lang="ts">
    import type { ImageMetaData } from "$lib/types";
    import { NativeSelect, InputWrapper, Flex } from "@svelteuidev/core";
    import { _ } from "svelte-i18n";
    import Tags from "svelte-tags-input";

    export let meta: ImageMetaData;
</script>

<Flex class="m-8" justify="center" align="center" gap="xl">
    <NativeSelect
        data={["public", "private"]}
        placeholder={meta.category}
        label={$_("term.category")}
        bind:value={meta.category}
    />
    <InputWrapper class="child:bg-red" label={$_("term.tag")}>
        <Tags bind:tags={meta.tags} />
    </InputWrapper>
</Flex>

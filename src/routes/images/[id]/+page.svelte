<script lang="ts">
	import { Center } from "@svelteuidev/core";
	import { _ } from "svelte-i18n";
	export let data;

	$: ({ image } = data);
</script>

<Center class="m-8 text-xl font-black">{$_("page.image.edit.title")}</Center>

<code>
	<pre>{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
</code>

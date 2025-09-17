<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "./$types";
	export let data: LayoutServerData;

	$: ({ image } = data);
</script>

<div class="m-8 text-xl font-black text-center">
	{$_("page.image.view.title")}
</div>

<code>
	<pre>{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
</code>

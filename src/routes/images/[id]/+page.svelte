<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { LayoutServerData } from "./$types";
	export let data: LayoutServerData;

	$: ({ image } = data);
</script>

<h1 class="title-page text-center my-6">{$_("page.image.view.title")}</h1>

{#if image}
	<div class="card mb-4">
		<div class="card-body text-sm space-y-2">
			<div><strong>uuid:</strong> {image.uuid}</div>
			<div><strong>category:</strong> {image.category}</div>
			<div><strong>originalName:</strong> {image.name ?? image.uuid}</div>
			<div><strong>uploadedAt:</strong> {image.uploadedAt ?? ""}</div>
			<div><strong>tags:</strong> {(image.meta?.tags ?? []).join(", ")}</div>
		</div>
	</div>
{/if}

<div class="card mb-6">
	<div class="card-body overflow-x-auto">
		<pre class="text-xs whitespace-pre-wrap">{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
	</div>
</div>

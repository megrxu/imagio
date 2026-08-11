<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Alert } from "flowbite-svelte";
	import { Button } from "flowbite-svelte";
	import { Copy } from "radix-icons-svelte";
	import type { PageData } from "./$types";
	export let data: PageData;

	$: ({ image } = data);

	function formatDate(value?: string) {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return value;
		}
		return date.toLocaleString();
	}
</script>

<h1 class="title-page text-center my-6">{$_("page.image.view.title")}</h1>


{#if image}
	<div class="card mb-4">
		<div class="card-body text-sm space-y-2">
			<div class="flex items-center gap-2">
				<strong>uuid:</strong>
				<span class="break-all">{image.uuid}</span>
				<Button
					color="none"
					size="xs"
					class="p-1 hover:bg-transparent focus:ring-0"
					title="拷贝 UUID"
					on:click={() => navigator.clipboard.writeText(image.uuid)}
				>
					<Copy class="text-muted" />
				</Button>
			</div>
			<div><strong>originalName:</strong> {image.meta?.originalName ?? image.name ?? image.uuid}</div>
			<div><strong>category:</strong> {image.category}</div>
			<div><strong>takenAt:</strong> {formatDate(image.meta?.takenAt)}</div>
			<div><strong>createdAt:</strong> {formatDate(image.meta?.createdAt)}</div>
			<div><strong>uploadedAt:</strong> {formatDate(image.uploadedAt)}</div>
		</div>
	</div>
{:else}
	<Alert color="gray" class="mb-4">未找到该图片的详情数据。</Alert>
{/if}


<div class="card mb-4">
	<div class="card-body overflow-x-auto">
		<div class="mb-2 text-sm font-semibold">metadata</div>
		<pre class="text-xs whitespace-pre-wrap">{#if image}{JSON.stringify(image.meta ?? {}, null, 2)}{/if}</pre>
	</div>
</div>

<div class="card mb-6">
	<div class="card-body overflow-x-auto">
		<div class="mb-2 text-sm font-semibold">image</div>
		<pre class="text-xs whitespace-pre-wrap">{#if image}{JSON.stringify(image, null, 2)}{/if}</pre>
	</div>
</div>

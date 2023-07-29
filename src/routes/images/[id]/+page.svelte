<script lang="ts">
	import { Center } from "@svelteuidev/core";
	export let data;

	$: ({ image } = data);
</script>

<Center class="m-8 text-xl font-black">Edit</Center>

<code>
	<pre>
		{#if image}
{JSON.stringify(image, null, 2)}
		{/if}
	</pre>
</code>

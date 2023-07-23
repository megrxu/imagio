<script>
	import { Container, Center, Flex } from '@svelteuidev/core';
	import { Button } from '@svelteuidev/core';
</script>

<Container>
	<Flex class="h-screen" justify="center" align="center" direction="column">
		<Center class="m-8 text-xl font-black">Show</Center>
		<Flex class="m-8" justify="center" align="center" gap="xl">
			<Button href="/">Go to Upload</Button>
		</Flex>
	</Flex>
</Container>

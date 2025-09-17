<script lang="ts">
    import { Button } from "flowbite-svelte";
    export let path: string;
    export let page: number;
</script>

<div class="flex my-2 justify-center gap-2">
    <Button
        tag="a"
        href={`${path}?page=${Math.max(page - 1, 1)}`}
        rel="prev"
        aria-label="上一页"
        size="xs"
        color="light"
        disabled={page <= 1}
    >
        <svg
            class="w-3.5 h-3.5 mr-2"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 10"
        >
            <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 5H1m0 0 4 4M1 5l4-4"
            />
        </svg>
        上一页
    </Button>
    <Button
        tag="a"
        href={`${path}?page=${page + 1}`}
        rel="next"
        aria-label="下一页"
        size="xs"
        color="light"
    >
        下一页
        <svg
            class="w-3.5 h-3.5 ml-2"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 10"
        >
            <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M1 5h12m0 0L9 1m4 4L9 9"
            />
        </svg>
    </Button>
</div>

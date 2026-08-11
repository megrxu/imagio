<script lang="ts">
    import { Button } from "flowbite-svelte";
    export let prevHref: string | null = null;
    export let nextHref: string | null = null;
    export let path = "/images";
    export let category = "public";
    export let sort = "uploaded";
    export let limit = 24;
    export let currentPage = 1;
    export let totalPages = 1;
    export let totalItems = 0;

    type PageToken = number | "ellipsis";
    let jumpPage = String(currentPage);
    let pageItems: PageToken[] = [];

    $: jumpPage = String(currentPage);

    function buildHref(page: number) {
        const params = new URLSearchParams();
        params.set("category", category);
        params.set("sort", sort);
        params.set("limit", String(limit));
        params.set("page", String(page));
        return `${path}?${params.toString()}`;
    }

    function buildPageItems(): PageToken[] {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const items: PageToken[] = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) {
            items.push("ellipsis");
        }

        for (let page = start; page <= end; page += 1) {
            items.push(page);
        }

        if (end < totalPages - 1) {
            items.push("ellipsis");
        }

        items.push(totalPages);
        return items;
    }

    $: pageItems = buildPageItems();

    $: resolvedPrevHref = prevHref ?? (currentPage > 1 ? buildHref(currentPage - 1) : null);
    $: resolvedNextHref = nextHref ?? (currentPage < totalPages ? buildHref(currentPage + 1) : null);
</script>

<div class="my-2 flex flex-wrap items-center justify-center gap-3">
    <div class="flex items-center gap-1" aria-label="分页导航" role="navigation">
        <Button
            tag="a"
            href={resolvedPrevHref ?? "#"}
            rel="prev"
            size="xs"
            color="alternative"
            disabled={!resolvedPrevHref}
        >
            上一页
        </Button>

        {#each pageItems as item, index (item === "ellipsis" ? `ellipsis-${index}` : `page-${item}`)}
            {#if item === "ellipsis"}
                <span class="px-2 text-xs text-muted">...</span>
            {:else}
                <Button
                    tag="a"
                    href={buildHref(item)}
                    size="xs"
                    color="alternative"
                    aria-current={item === currentPage ? "page" : undefined}
                    class={`min-w-9 px-3 ${item === currentPage ? "pointer-events-none !bg-[rgb(var(--page-bg-accent))] !border-[rgb(var(--border))] !text-[rgb(var(--surface-foreground))] font-medium" : ""}`}
                >
                    {item}
                </Button>
            {/if}
        {/each}

        <Button
            tag="a"
            href={resolvedNextHref ?? "#"}
            rel="next"
            size="xs"
            color="alternative"
            disabled={!resolvedNextHref}
        >
            下一页
        </Button>
    </div>

    <div class="text-xs text-muted">
        第 {currentPage} / {totalPages} 页，共 {totalItems} 条
    </div>

    <form class="flex items-center gap-2" method="GET" action={path}>
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="limit" value={String(limit)} />
        <label for="jump-page" class="text-xs text-muted">跳到</label>
        <input
            id="jump-page"
            name="page"
            type="number"
            min="1"
            max={String(totalPages)}
            bind:value={jumpPage}
            class="w-16 rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-1 text-xs"
        />
        <Button type="submit" size="xs" color="alternative">跳转</Button>
    </form>
</div>

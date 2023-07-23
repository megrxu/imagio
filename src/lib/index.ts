export async function clickToCopy(text: string | undefined) {
    if (text) {
        await navigator.clipboard.writeText(text);
    }
}

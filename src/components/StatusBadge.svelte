<script lang="ts">
  interface Props {
    label: string
  }

  let { label }: Props = $props()
</script>

<span
  class="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300"
>
  {label}
</span>

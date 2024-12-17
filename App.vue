<template>
  <WinBox @maximize="handleEmit" @restore="handleEmit" @close="handleEmit" @resize="handleEmit">
    <template #title>Testing Title</template>
    <template #default>
      <p>Testing Content</p>
    </template>
  </WinBox>
</template>

<script setup lang="ts">
import WinBox from "./src/components/WinBox.vue";

const handleEmit = (...args: any[]) => {
  console.log(args)
}
</script>

/// <reference path="../types/test-globals.d.ts" />
import { beforeEach } from 'vitest'
import '@testing-library/jest-dom'

// Setup DOM environment
beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear()
  
  // Reset DOM
  document.body.innerHTML = ''
})
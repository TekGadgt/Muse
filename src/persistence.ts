export function enqueueSave(tail: Promise<void>, operation: () => Promise<void>): Promise<void> {
  return tail.then(operation);
}

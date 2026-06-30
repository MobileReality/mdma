/**
 * Asserts that the output contains a button with a confirm dialog.
 */
export default function (output) {
  const hasButton = output.includes('type: button');
  const hasConfirm = output.includes('confirm:');
  const hasConfirmText = output.includes('confirmText:') || output.includes('message:');

  if (hasButton && hasConfirm && hasConfirmText) {
    return { pass: true, score: 1, reason: 'Button with confirmation dialog found' };
  }
  return {
    pass: false,
    score: hasButton ? 0.5 : 0,
    reason: `Expected button with confirm dialog. ${!hasButton ? 'No button found' : 'Missing confirm config'}`,
  };
}

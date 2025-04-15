import { setupForm } from './video-input.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>MP4 to Gif</h1>

  <form id="form">
    <label title="Sets the gif width, aspect ratio is maintained">
      Gif Size (higher means bigger file)
      <input type="number" name="scale" value="160" />
    </label>

    <label title="Sets the Gif FPS (Frames Per Second)">
      Gif Smoothness (higher means bigger file)
      <input type="number" name="fps" min="6" max="60" value="6" />
    </label>

    <input type="file" name="file" required />

    <button>Convert!</button>
  </form>

  <div>
    <p id="message"></p>

    <progress id="progress" max="100" value="0"></progress>

    <img id="palette" />
  </div>
`

setupForm(
  document.querySelector<HTMLFormElement>('#form')!,
  document.querySelector<HTMLImageElement>('#palette')!,
  document.querySelector<HTMLParagraphElement>('#message')!,
  document.querySelector<HTMLProgressElement>('#progress')!,
)

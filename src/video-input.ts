import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

let ffmpeg: FFmpeg | null = null

function messageLogger(container: HTMLParagraphElement) {
  return (message: string) => container.textContent = message
}

export function setupForm(
  form: HTMLFormElement,
  palette: HTMLImageElement,
  message: HTMLParagraphElement,
  progressBar: HTMLProgressElement,
) {
  const convert = async (file: File, fps: number, scale: number) => {
    const log = messageLogger(message)

    if (ffmpeg === null) {
      ffmpeg = new FFmpeg()

      ffmpeg.on('progress', ({ progress }) => progressBar.value = Math.round(progress * 100))

      log('Loading libraries')
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      log('Done loading libraries')
    }

    const { name } = file
    await ffmpeg.writeFile(name, await fetchFile(file))
    log('Converting...')

    await ffmpeg.exec([
      '-i',
      name,
      '-vf',
      `fps=${fps},scale=${scale}:-1:flags=lanczos,palettegen`,
      '-y',
      'palette.png',
    ])

    const paletteData = await ffmpeg.readFile('palette.png')
    await ffmpeg.writeFile('palette.png', paletteData)

    await ffmpeg.exec([
      '-i',
      name,
      '-i',
      'palette.png',
      '-filter_complex',
      `fps=${fps},scale=${scale}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
      '-y',
      'output.gif',
    ])

    const gifData = await ffmpeg.readFile('output.gif')
    log('Conversion done!')

    palette.src = URL.createObjectURL(new Blob([gifData], { type: 'image/gif' }))
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (event.target == null)
      return

    const formData = new FormData(event.target as HTMLFormElement)
    const file = formData.get('file') as File

    if (file.size === 0 || file.name === '')
      return

    convert(file, Number(formData.get('fps')), Number(formData.get('scale')))
  })
}

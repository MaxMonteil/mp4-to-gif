import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const form = document.querySelector<HTMLFormElement>('#form')!
const uploader = document.querySelector<HTMLInputElement>('#uploader')!
const previewVideo = document.querySelector<HTMLVideoElement>('#preview')!

const durationInput = document.querySelector<HTMLInputElement>('input[name="duration"]')!
const fpsInput = document.querySelector<HTMLInputElement>('input[name="fps"]')!
const scaleInput = document.querySelector<HTMLInputElement>('input[name="scale"]')!

const palette = document.querySelector<HTMLImageElement>('#palette')!
const message = document.querySelector<HTMLParagraphElement>('#message')!
const progressBar = document.querySelector<HTMLProgressElement>('#progress')!
const fileSize = document.querySelector<HTMLProgressElement>('#file-size')!

// Populate the form from Query Params if available
const params = new URLSearchParams(window.location.search)

const duration = params.get('duration')
const fps = params.get('smoothness')
const scale = params.get('size')

if (duration)
  durationInput.value = duration
if (fps)
  fpsInput.value = fps
if (scale)
  scaleInput.value = scale

const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
let ffmpeg: FFmpeg | null = null

async function loadVideo() {
  const file = uploader.files?.[0]
  if (!file)
    return

  const url = URL.createObjectURL(file)
  previewVideo.preload = 'metadata'
  previewVideo.src = url

  previewVideo.onloadedmetadata = () => {
    durationInput.setAttribute('max', String(previewVideo.duration))
  }

  previewVideo.onerror = () => {
    throw new Error('Failed to load video metadata')
  }
}

uploader.addEventListener('change', loadVideo)

async function convert(file: File, fps: number, scale: number, duration?: number) {
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
    '-ss',
    '0',
    ...(duration ? ['-t', String(duration)] : []),
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
    '-ss',
    '0',
    ...(duration ? ['-t', String(duration)] : []),
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
  fileSize.textContent = `Gif size: ${(gifData.length / (1024 * 1024)).toFixed(2)}MB`
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  if (event.target == null)
    return

  const formData = new FormData(event.target as HTMLFormElement)
  const file = formData.get('file') as File

  if (file.size === 0 || file.name === '')
    return

  convert(file, Number(formData.get('fps')), Number(formData.get('scale')), Number(formData.get('duration')))
})

form.addEventListener('input', () => {
  const formData = new FormData(form)
  const params = new URLSearchParams()

  for (const [key, value] of formData.entries()) {
    if (value && key !== 'file')
      params.set(key, String(value))
  }

  const newURL = `${location.pathname}?${params.toString()}`
  history.replaceState(null, '', newURL)
})

function messageLogger(container: HTMLParagraphElement) {
  return (message: string) => container.textContent = message
}

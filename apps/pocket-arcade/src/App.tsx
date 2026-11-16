import { Workshop } from '@ouuo/shared'

export default function App() {
  return (
    <Workshop
      title="Pocket Arcade"
      description="A little world you can hold. A browser handheld with real buttons, original games and the kind of details that make you want one more turn."
      features={[
        {
          name: 'Rhythm Rush',
          detail:
            'Planned: an original falling-note rhythm game with scored timing and replay.',
        },
        {
          name: 'Pixel Racer',
          detail:
            'Planned: a quick obstacle-dodging racer with increasing difficulty.',
        },
        {
          name: 'Mini Puzzle',
          detail:
            'Planned: a replayable logic puzzle, wrapped in a complete handheld operating system.',
        },
      ]}
    />
  )
}

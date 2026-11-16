import { Workshop } from '@ouuo/shared'

export default function App() {
  return (
    <Workshop
      title="Tiny Studio"
      description="A small desk for big little ideas. A pocket-sized synth, drum machine and sequencer, being built to make happy accidents worth keeping."
      features={[
        {
          name: 'Make a sound',
          detail:
            'Planned: a polyphonic synthesizer, tactile knobs and a playable keyboard.',
        },
        {
          name: 'Find a rhythm',
          detail:
            'Planned: an original drum kit and a clock-synchronised step sequencer.',
        },
        {
          name: 'Keep the good bits',
          detail:
            'Planned: effects, saved patterns and audio export. Nothing leaves your browser without you.',
        },
      ]}
    />
  )
}

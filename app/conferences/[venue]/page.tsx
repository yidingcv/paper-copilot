import VenueClient from './VenueClient'

export function generateStaticParams() {
  return [
    { venue: 'arxiv' },
    { venue: 'neurips' },
    { venue: 'iclr' },
    { venue: 'icml' },
    { venue: 'cvpr' },
    { venue: 'iccv' },
    { venue: 'eccv' },
    { venue: 'tpami' },
    { venue: 'tip' },
    { venue: 'tmm' },
    { venue: 'ijcv' },
  ]
}

interface PageProps {
  params: { venue: string }
}

export default function VenuePage({ params }: PageProps) {
  return <VenueClient venue={params.venue} />
}
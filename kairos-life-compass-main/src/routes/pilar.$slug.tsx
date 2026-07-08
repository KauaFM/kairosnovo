import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPillar, type PillarSlug } from "@/lib/pillars";
import { getPillarData } from "@/lib/data-engine";
import { PillarLayered } from "@/components/PillarLayered";

export const Route = createFileRoute("/pilar/$slug")({
  loader: ({ params }) => {
    const config = getPillar(params.slug);
    if (!config) throw notFound();
    return { slug: config.slug };
  },
  head: ({ loaderData }) => {
    const name = loaderData ? getPillar(loaderData.slug)?.name : "Pilar";
    return {
      meta: [
        { title: `${name} — Kairos` },
        { name: "description", content: `Camada operacional e estratégica de ${name}.` },
        { property: "og:title", content: `${name} — Kairos` },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="label-meta">404</div>
        <h1 className="text-3xl font-light mt-2">Pilar não encontrado</h1>
        <Link to="/" className="text-primary mt-4 inline-block">Voltar</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="label-meta text-destructive">ERRO</div>
        <p className="text-foreground mt-2">{error.message}</p>
        <Link to="/" className="text-primary mt-4 inline-block">Voltar para a home</Link>
      </div>
    </div>
  ),
  component: PilarPage,
});

function PilarPage() {
  const { slug } = Route.useLoaderData();
  const data = getPillarData(slug as PillarSlug);
  return <PillarLayered data={data} />;
}

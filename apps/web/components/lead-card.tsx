import {
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StoreLead } from "@/lib/types";

export function LeadCard({
  lead,
  rank,
  demo,
}: {
  lead: StoreLead;
  rank: number;
  demo: boolean;
}) {
  return (
    <Card className="gap-5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardDescription className="mb-1">
              #{rank} recommendation
            </CardDescription>
            <CardTitle className="truncate text-lg">{lead.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {lead.score}% fit
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{lead.address}</span>
        </p>
        <p className="text-sm leading-6">{lead.reason}</p>
        <div className="flex flex-wrap gap-2">
          {lead.rating ? (
            <Badge variant="outline" className="gap-1">
              <Star className="size-3 fill-current" aria-hidden="true" />
              {lead.rating.toFixed(1)}
              {lead.ratingCount
                ? ` (${lead.ratingCount.toLocaleString()})`
                : ""}
            </Badge>
          ) : null}
          {lead.email ? (
            <Badge variant="outline" className="gap-1">
              <Mail className="size-3" aria-hidden="true" />
              Email found
            </Badge>
          ) : null}
          {lead.phone ? (
            <Badge variant="outline" className="gap-1">
              <Phone className="size-3" aria-hidden="true" />
              Phone found
            </Badge>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        {lead.email && !demo ? (
          <Button asChild size="sm">
            <a href={`mailto:${lead.email}`}>
              <Mail aria-hidden="true" />
              {lead.email}
            </a>
          </Button>
        ) : lead.email ? (
          <Button size="sm" disabled>
            <Mail aria-hidden="true" />
            {lead.email}
          </Button>
        ) : null}
        {lead.phone && !demo ? (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${lead.phone}`}>
              <Phone aria-hidden="true" />
              {lead.phone}
            </a>
          </Button>
        ) : lead.phone ? (
          <Button size="sm" variant="outline" disabled>
            <Phone aria-hidden="true" />
            {lead.phone}
          </Button>
        ) : null}
        {lead.website && !demo ? (
          <Button asChild size="icon-sm" variant="ghost">
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${lead.name} website`}
            >
              <Globe2 aria-hidden="true" />
            </a>
          </Button>
        ) : null}
        {lead.mapsUrl ? (
          <Button asChild size="icon-sm" variant="ghost">
            <a
              href={lead.mapsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${lead.name} in Google Maps`}
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

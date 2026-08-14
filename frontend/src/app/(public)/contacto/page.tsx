import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactoPage() {
  return (
    <div className="page-enter container mx-auto max-w-4xl px-4 py-12 md:py-16">
      <p className="eyebrow mb-2">Estamos cerca</p>
      <h1 className="section-heading mb-3">Contacto</h1>
      <p className="mb-10 max-w-lg text-muted-foreground">Estamos para atenderte</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: MapPin, title: 'Dirección', desc: 'Consultar en tienda física' },
          { icon: Phone, title: 'Teléfono', desc: 'Próximamente' },
          { icon: Mail, title: 'Correo', desc: 'info@lamerced.com' },
          { icon: Clock, title: 'Horario', desc: 'Lun–Sáb 9:00 a.m. – 8:00 p.m.' },
        ].map(({ icon: Icon, title, desc }) => (
          <Card
            key={title}
            className="rounded-2xl border-0 bg-card/80 py-0 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <CardContent className="flex gap-4 p-6">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

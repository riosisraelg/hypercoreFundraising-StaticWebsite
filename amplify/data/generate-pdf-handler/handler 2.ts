import type { Schema } from "../resource";

export const handler: Schema["generateTicketPdf"]["functionHandler"] =
  async (event) => {
    const { ticketId } = event.arguments;

    // PDF generation will be handled client-side for MVP
    // using a library like jsPDF. This function just validates
    // the request and returns ticket metadata.

    return JSON.stringify({
      ticketId,
      drawTitle: "Sorteo HyperCore — Innovation MeetUp 2026",
      drawDate: "25 de Abril, 2026 — 6:00 PM",
      brand: "HYPERCORE",
      tagline: "Universidad Tecmilenio",
    });
  };

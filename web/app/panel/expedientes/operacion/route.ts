import { clinicalRequest } from "../../../../lib/clinical-route";

export function POST(request: Request) {
  return clinicalRequest(request, "dental_operation");
}

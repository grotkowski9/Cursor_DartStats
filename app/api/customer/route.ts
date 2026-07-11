import { NextResponse } from "next/server";
import { getCustomerById } from "@/lib/customer";
import { DEFAULT_CUSTOMER_ID } from "@/lib/constants";

export async function GET() {
  try {
    const customer = await getCustomerById(DEFAULT_CUSTOMER_ID);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

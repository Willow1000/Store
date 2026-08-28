import { TRPCError } from "@trpc/server";

export interface VinDecodedData {
  year?: string | number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  vehicleType?: string;
  engineCylinders?: string | number;
  displacement?: string;
  fuelType?: string;
  driveType?: string | null;
  manufacturer?: string;
  plantCountry?: string;
  [key: string]: any;
}

export interface VinDecoderResponse {
  ok: boolean;
  vin: string;
  valid: boolean;
  checkDigitValid: boolean;
  decode: VinDecodedData;
  decodeError: string | null;
  attribution: string;
}

const VIN_DECODER_API_BASE = "https://vinwhere.com/api/v1";

/**
 * Validate VIN format (basic check)
 * VIN should be 17 characters alphanumeric
 */
function validateVin(vin: string): boolean {
  if (!vin || typeof vin !== "string") return false;
  const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return vinPattern.test(vin.trim());
}

/**
 * Decode a VIN using the vinwhere.com API
 * @param vin - The VIN code to decode (17 characters)
 * @returns Full API response with decoded vehicle information
 */
export async function decodeVin(vin: string): Promise<VinDecoderResponse> {
  const trimmedVin = vin?.trim();

  if (!trimmedVin) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "VIN is required",
    });
  }

  if (!validateVin(trimmedVin)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid VIN format. VIN must be 17 alphanumeric characters.",
    });
  }

  try {
    const response = await fetch(
      `${VIN_DECODER_API_BASE}/decode?vin=${encodeURIComponent(trimmedVin)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let data: VinDecoderResponse;
    try {
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response body");
      }
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("[VIN Decoder] Response parse error:", parseError);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to parse VIN decoder response",
      });
    }

    if (!response.ok) {
      // Check if the API returned an error in the response
      if (data?.decodeError || !data?.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            data?.decodeError || `Failed to decode VIN (${response.status})`,
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `VIN decoder API returned status ${response.status}`,
      });
    }

    // Ensure the response has the expected structure
    if (!data.decode || !data.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid VIN or unable to decode",
      });
    }

    // Return the full API response including metadata
    return data;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reach VIN decoder service. Please try again later.",
      });
    }

    console.error("[VIN Decoder] Unexpected error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to decode VIN",
    });
  }
}

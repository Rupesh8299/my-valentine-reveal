import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Index from "./Index";
import { apiBaseUrl } from "@/lib/api";

const OwnerLive = () => {
  const { spaceId = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<{ loverName: string; ownerName: string } | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/spaces/${encodeURIComponent(spaceId)}`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Page unavailable.");
        return payload;
      })
      .then((payload) => setState({ loverName: payload.loverName, ownerName: payload.ownerName }))
      .catch(() => navigate("/login"));
  }, [navigate, spaceId]);

  if (!state) return <main className="grid min-h-screen place-items-center bg-[#090712] text-white">Opening your private page...</main>;
  return <Index ownerSpaceId={spaceId} ownerName={state.ownerName} partnerNameOverride={state.ownerName} connectionPartnerName={state.loverName} />;
};

export default OwnerLive;

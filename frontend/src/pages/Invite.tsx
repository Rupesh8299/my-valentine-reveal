import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { lookupInvite } from "@/lib/auth";

const Invite = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    lookupInvite(token)
      .then(({ spaceId, loverName, senderName }) => {
        if (!senderName) throw new Error("This invitation has no sender identity.");
        navigate("/", {
          replace: true,
          state: { partnerName: loverName, connectionPartnerName: senderName, inviteToken: token, spaceId },
        });
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "This invite is unavailable."));
  }, [navigate, token]);

  if (!error) return <main className="grid min-h-screen place-items-center bg-[#090712] text-white">Opening your private Valentine page...</main>;
  return (
    <main className="grid min-h-screen place-items-center bg-[#090712] px-6 text-center text-white">
      <div><h1 className="text-3xl font-semibold">This invitation is no longer available</h1><p className="mt-3 text-white/60">{error}</p><Link className="mt-6 inline-block text-rose-300" to="/">Return home</Link></div>
    </main>
  );
};

export default Invite;

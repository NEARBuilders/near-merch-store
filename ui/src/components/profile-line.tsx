import type { Profile } from "near-social-js";

type ProfileLineProps = {
  accountId: string;
  profile: Profile | null;
};

export function ProfileLine({ accountId, profile }: ProfileLineProps) {
  return (
    <div className="border border-[rgba(0,0,0,0.1)] p-6 mb-4 bg-card">
      <div className="flex items-start gap-4">
        {profile?.image?.ipfs_cid ? (
          <img
            src={`https://ipfs.near.social/ipfs/${profile.image.ipfs_cid}`}
            alt={profile.name || accountId}
            className="size-16 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="size-16 rounded-full bg-[#00ec97] flex items-center justify-center">
            <svg className="size-8" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          {profile?.name ? (
            <>
              <h3 className="text-xl font-medium mb-1">{profile.name}</h3>
              <p className="text-sm text-[#717182]">{accountId}</p>
            </>
          ) : (
            <p className="text-sm text-[#717182]">{accountId}</p>
          )}
        </div>
      </div>
    </div>
  );
}

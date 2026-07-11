import type { CustomerProfile } from "@/lib/customer";

type Props = {
  customer: CustomerProfile;
};

export function ProfileHeader({ customer }: Props) {
  const nick = customer.nickname?.trim();

  return (
    <header className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
        Witaj,
      </span>
      <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
        {customer.firstName}{" "}
        {nick ? (
          <>
            <span className="text-accent-gradient">„{nick}”</span>{" "}
          </>
        ) : null}
        {customer.lastName}
      </h1>
    </header>
  );
}

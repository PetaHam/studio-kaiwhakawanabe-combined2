import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add the router pusher effect
redirect_effect = r'''  useEffect(() => {
    const handleScroll = () => {'''

new_redirect_effect = r'''  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const handleScroll = () => {'''

text = text.replace(redirect_effect, new_redirect_effect)

# Return a completely blank slate if the user object is loading or forcing them to login 
# This prevents the UI from "flashing" the dashboard for 0.3s before routing them away
early_return = r'''  if (isUserLoading || (!user && !isUserLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[120vh] pb-24 bg-background overflow-x-hidden pt-4">'''

if "if (isUserLoading || (!user && !isUserLoading)) {" not in text:
    text = text.replace(
        '  return (\n    <div className="min-h-[120vh] pb-24 bg-background overflow-x-hidden pt-4">',
        early_return
    )

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Protected Dashboard Route!")

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCardResource;
use App\Repositories\CatalogRepository;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Webfolks\CommerceCore\Models\Order;

/**
 * A free, dependency-free shopping assistant.
 *
 * It answers store questions (orders, shipping, payments, returns, contact) from live store data
 * and turns free-text requests ("linen shirt under 3000") into product picks using the same smart
 * search as the storefront. No external AI service or API key is used, so it costs nothing to run
 * and never sends customer messages to a third party.
 */
class AssistantController extends Controller
{
    private const STOP_WORDS = [
        'show', 'me', 'find', 'i', 'want', 'need', 'looking', 'look', 'for', 'a', 'an', 'the', 'some', 'any', 'please',
        'buy', 'get', 'have', 'do', 'you', 'got', 'to', 'of', 'and', 'with', 'can', 'recommend', 'suggest', 'something',
        'best', 'good', 'nice', 'my', 'is', 'are', 'there', 'what', 'which', 'where', 'in', 'on', 'under', 'below', 'about',
    ];

    public function __invoke(Request $request, CatalogRepository $catalog, WhatsAppService $whatsapp): JsonResponse
    {
        $validated = $request->validate(['message' => ['required', 'string', 'max:300']]);
        $message = trim($validated['message']);
        $text = Str::lower($message);

        if (preg_match('/\bord-\d{8}-[a-z0-9]{4,10}\b/i', $message, $match)) {
            return $this->reply($this->orderStatus($request, strtoupper($match[0])), 'order');
        }

        if (preg_match('/^(hi|hello|hey|hii|namaste|good (morning|afternoon|evening))\b/', $text)) {
            return $this->reply([
                'reply' => 'Hi! I can help you find products, track an order, or answer questions about shipping, payments and returns. What do you need?',
            ], 'greeting');
        }

        if (preg_match('/track|order status|where.*(order|parcel|package)|my order|delivery status/', $text)) {
            return $this->reply($this->trackingHelp($request), 'tracking');
        }

        if (preg_match('/ship|deliver|dispatch|how long|arrive/', $text)) {
            $rate = config('commerce.shipping.flat_rate');

            return $this->reply([
                'reply' => sprintf(
                    'We ship with %s at a flat %s %s. You will see the exact total at checkout, and you can follow every step from the Orders page once it is placed.',
                    Str::lower((string) ($rate['name'] ?? 'standard shipping')),
                    config('commerce.currency'),
                    $rate['amount'] ?? '0.00',
                ),
            ], 'shipping');
        }

        if (preg_match('/return|refund|exchange|cancel/', $text)) {
            return $this->reply([
                'reply' => 'You can cancel an order from your Orders page until it ships. For returns or refunds on eligible orders, send us the order number through the contact page and we will take it from there.',
                'actions' => [['label' => 'Contact us', 'url' => '/contact']],
            ], 'returns');
        }

        if (preg_match('/pay|cod|cash on|upi|razorpay|paypal|stripe|card|netbanking/', $text)) {
            /** @var array{data?: array{methods?: array<int, array{label: string}>}} $payload */
            $payload = app(PaymentController::class)->methods()->getData(true);
            $labels = array_column($payload['data']['methods'] ?? [], 'label');

            return $this->reply([
                'reply' => $labels === []
                    ? 'Payment options are shown at checkout.'
                    : 'You can pay with '.$this->humanList($labels).'. All payments are verified on the server before an order is confirmed.',
            ], 'payments');
        }

        if (preg_match('/human|agent|support|contact|call|talk|whatsapp|help me/', $text)) {
            $number = $whatsapp->normalizePhone(config('services.whatsapp.business_number'));
            $actions = [['label' => 'Contact page', 'url' => '/contact']];

            if ($number) {
                array_unshift($actions, ['label' => 'Chat on WhatsApp', 'url' => 'https://wa.me/'.$number.'?text='.rawurlencode('Hi, I need help with my order.')]);
            }

            return $this->reply(['reply' => 'Happy to connect you with the team.', 'actions' => $actions], 'handoff');
        }

        if (preg_match('/coupon|promo|offer|discount|sale|deal/', $text)) {
            $products = $catalog->search(['on_sale' => true, 'in_stock' => true, 'per_page' => 4])->items();

            return $this->reply([
                'reply' => $products !== []
                    ? 'Here are items on sale right now. You can also enter a coupon code in your bag before checkout.'
                    : 'Nothing is marked down at the moment, but you can enter a coupon code in your bag before checkout.',
                'products' => ProductCardResource::collection(collect($products))->resolve(),
            ], 'offers');
        }

        return $this->reply($this->productSearch($message, $catalog), 'products');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function reply(array $payload, string $intent): JsonResponse
    {
        return response()->json(['data' => array_merge([
            'intent' => $intent,
            'products' => [],
            'actions' => [],
            'suggestions' => ['Track my order', 'Shipping info', 'Payment options', 'What is on sale?'],
        ], $payload)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function orderStatus(Request $request, string $number): array
    {
        $user = $request->user('sanctum');
        $order = Order::query()->where('number', $number)->first();

        // Order details are only shared with the signed-in owner, so an order number alone reveals nothing.
        if (! $order || ! $user || (int) $order->user_id !== (int) $user->id) {
            return [
                'reply' => $user
                    ? "I couldn't find order {$number} on your account. Double-check the number, or open your Orders page."
                    : 'Please sign in first so I can look up your order securely.',
                'actions' => [['label' => $user ? 'My orders' : 'Sign in', 'url' => $user ? '/account/orders' : '/login']],
            ];
        }

        return [
            'reply' => sprintf(
                'Order %s is %s and payment is %s. The total is %s %s.',
                $order->number,
                str_replace('_', ' ', $order->status->value),
                str_replace('_', ' ', $order->payment_status->value),
                config('commerce.currency'),
                $order->total,
            ),
            'actions' => [['label' => 'View order', 'url' => '/account/orders/'.$order->number]],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function trackingHelp(Request $request): array
    {
        $user = $request->user('sanctum');

        if (! $user) {
            return [
                'reply' => 'Sign in and send me your order number (it looks like ORD-20260101-ABC123) and I will check it for you.',
                'actions' => [['label' => 'Sign in', 'url' => '/login']],
            ];
        }

        $latest = Order::query()->where('user_id', $user->id)->latest('id')->first();

        return $latest
            ? $this->orderStatus($request, $latest->number)
            : ['reply' => "You don't have any orders yet. Browse the shop and I can help you pick something."];
    }

    /**
     * @return array<string, mixed>
     */
    private function productSearch(string $message, CatalogRepository $catalog): array
    {
        $withoutBudget = preg_replace('/\b(?:under|below|less than|upto|up to|within)\s*(?:₹|rs\.?\s*|\$)?\s*\d[\d,]*/iu', ' ', $message) ?? $message;

        /** @var Collection<int, string> $tokens */
        $tokens = collect(preg_split('/[^\p{L}\p{N}]+/u', Str::lower($withoutBudget)) ?: [])
            ->filter(fn ($word) => $word !== '' && ! in_array($word, self::STOP_WORDS, true))
            ->values();

        $attempts = collect([$tokens->implode(' ')])
            ->merge($tokens->filter(fn ($word) => mb_strlen($word) > 2)->sortByDesc(fn ($word) => mb_strlen($word)))
            ->filter()
            ->unique();

        // Keep any price phrase so the shop's natural-language search can apply it. That parser only
        // understands "under N", so "below / up to / within / less than N" are normalised to it.
        $budget = '';

        if (preg_match('/\b(?:under|below|less than|upto|up to|within)\s*(?:₹|rs\.?\s*|\$)?\s*(\d[\d,]*)/iu', $message, $price) === 1) {
            $budget = ' under '.str_replace(',', '', $price[1]);
        }

        foreach ($attempts as $term) {
            $results = collect($catalog->search(['q' => $term.$budget, 'in_stock' => true, 'per_page' => 4])->items());

            if ($results->isNotEmpty()) {
                return [
                    'reply' => $results->count() === 1 ? 'I found one great match:' : "Here are {$results->count()} picks for you:",
                    'products' => ProductCardResource::collection($results)->resolve(),
                    'suggestions' => ['Show me something cheaper', 'What is on sale?', 'Talk to a person'],
                ];
            }
        }

        return [
            'reply' => "I couldn't find that exact item. Try a category or material (like \"linen shirt\" or \"bags under 3000\"), or ask me about shipping, payments or your order.",
        ];
    }

    /**
     * @param  array<int, string>  $items
     */
    private function humanList(array $items): string
    {
        return count($items) <= 1
            ? implode('', $items)
            : implode(', ', array_slice($items, 0, -1)).' or '.end($items);
    }
}

def int_to_base36(n: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    result = []
    while n > 0:
        result.append(chars[n % 36])
        n //= 36
    return "".join(reversed(result))

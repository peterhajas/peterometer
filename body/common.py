def attempt_float(value):
    string_to_try = value.replace(',','')
    try:
        return float(string_to_try)
    except ValueError:
        return None

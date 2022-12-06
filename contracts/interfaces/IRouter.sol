interface IRouter {
    function buy(address _token, address[] calldata _recipients, uint256[] calldata _amountIns, uint256[] calldata _maxOuts)  external returns (uint256 amountSpent);
    function sell(address _token, address[] calldata _sellers, uint256[] calldata _amountIns, bool _isPercent)  external returns (uint256 amountReceived);
}